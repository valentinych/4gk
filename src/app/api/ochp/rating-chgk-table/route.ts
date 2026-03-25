import { NextResponse } from "next/server";
import {
  cumulativeTourSums,
  expectedMaskLength,
  parseMaskIntoTours,
  ratingChgkResultsQuery,
  resultHasChstFlag,
  tourSlicesFromQuestionQty,
} from "@/lib/chgk-tournament-results";

export const dynamic = "force-dynamic";

const RATING = "https://api.rating.chgk.info";

async function fetchTournamentAndResults(
  tournamentId: number,
  auth: string | undefined,
): Promise<[Response, Response]> {
  const authHeaders: Record<string, string> = auth
    ? { Authorization: auth }
    : {};
  const tUrl = `${RATING}/tournaments/${tournamentId}`;
  const rUrl = `${RATING}/tournaments/${tournamentId}/results?${ratingChgkResultsQuery(0)}`;
  const opts = (headers: Record<string, string>) =>
    ({ headers, next: { revalidate: 300 } }) as const;

  let tRes: Response;
  let rRes: Response;
  if (auth) {
    [tRes, rRes] = await Promise.all([
      fetch(tUrl, opts(authHeaders)),
      fetch(rUrl, opts(authHeaders)),
    ]);
    if (tRes.status === 401 || rRes.status === 401) {
      [tRes, rRes] = await Promise.all([
        fetch(tUrl, opts({})),
        fetch(rUrl, opts({})),
      ]);
    }
  } else {
    [tRes, rRes] = await Promise.all([
      fetch(tUrl, opts({})),
      fetch(rUrl, opts({})),
    ]);
  }
  return [tRes, rRes];
}

interface ResultRow {
  team: { id: number; name: string; town: { id: number; name: string } };
  current: { name: string; town: { id: number; name: string } };
  questionsTotal: number | null;
  position: number;
  mask?: string | null;
  flags?: unknown;
}

interface TournamentJson {
  id: number;
  name: string;
  questionQty: Record<string, number>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("tournamentId");
  const tournamentId = raw != null ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(tournamentId) || tournamentId < 1) {
    return NextResponse.json({ error: "tournamentId required" }, { status: 400 });
  }

  const auth = process.env.RATING_CHGK_AUTHORIZATION?.trim();

  try {
    const [tRes, rRes] = await fetchTournamentAndResults(tournamentId, auth);

    if (!tRes.ok) {
      return NextResponse.json(
        { error: `Tournament ${tRes.status}` },
        { status: 502 },
      );
    }
    if (!rRes.ok) {
      return NextResponse.json(
        { error: `Results ${rRes.status}` },
        { status: 502 },
      );
    }

    const tournament = (await tRes.json()) as TournamentJson;
    const results = (await rRes.json()) as ResultRow[];

    const slices = tourSlicesFromQuestionQty(tournament.questionQty ?? {});
    const expectLen = expectedMaskLength(slices);

    const firstMask = results.find(
      (r) => typeof r.mask === "string" && r.mask.length > 0,
    )?.mask;
    const masksAvailable =
      typeof firstMask === "string" &&
      firstMask.length > 0 &&
      (expectLen === 0 || firstMask.length >= expectLen);

    let extraRoundMaxLen = 0;
    for (const r of results) {
      if (typeof r.mask === "string" && expectLen > 0 && r.mask.length > expectLen) {
        extraRoundMaxLen = Math.max(extraRoundMaxLen, r.mask.length - expectLen);
      }
    }

    const teams = results
      .filter((r) => r.position !== 9999)
      .sort((a, b) => {
        if (a.position !== b.position)
          return a.position < b.position ? -1 : 1;
        return a.current.name.localeCompare(b.current.name, "ru");
      })
      .map((r) => {
        const mask =
          typeof r.mask === "string" && r.mask.length > 0 ? r.mask : null;
        let tourSums: number[] | null = null;
        let remainderSum: number | null = null;
        if (mask && masksAvailable && slices.length > 0) {
          const { tours, remainder } = parseMaskIntoTours(mask, slices);
          tourSums = tours.map((t) => t.sumOnes);
          if (remainder.length > 0) {
            remainderSum = remainder.split("").filter((c) => c === "1").length;
          }
        }
        return {
          position: r.position,
          teamId: r.team.id,
          name: r.current.name,
          city: r.current.town.name,
          questionsTotal: r.questionsTotal,
          mask,
          isChst: resultHasChstFlag(r.flags),
          tourSums,
          cumulativeAfterTour:
            tourSums && tourSums.length > 0
              ? cumulativeTourSums(tourSums)
              : null,
          remainderSum,
        };
      });

    return NextResponse.json({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      tours: slices.map((s) => ({ n: s.tourNum, q: s.questionCount })),
      expectedMaskLength: expectLen,
      extraRoundMaxLen,
      teams,
      masksAvailable,
      authConfigured: Boolean(auth),
      docsUrl:
        "https://api.rating.chgk.info/#tag/Tournament/operation/api_tournaments_idresults_get_collection",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
