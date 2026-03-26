import { NextResponse } from "next/server";
import {
  formatOchpTournamentDateRange,
  ochpSeasonHadNoChampionship,
  OCHP_SEASON_START_MAX,
  OCHP_SEASON_START_MIN,
  resolveOchpRatingTournamentId,
} from "@/lib/ochp-seasons";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("season");
  const seasonStart =
    raw != null && raw !== ""
      ? parseInt(raw, 10)
      : OCHP_SEASON_START_MAX;

  if (
    Number.isNaN(seasonStart) ||
    seasonStart < OCHP_SEASON_START_MIN ||
    seasonStart > OCHP_SEASON_START_MAX
  ) {
    return NextResponse.json({ error: "invalid season" }, { status: 400 });
  }

  if (ochpSeasonHadNoChampionship(seasonStart)) {
    return NextResponse.json({ dateLabel: null });
  }

  const tournamentId = resolveOchpRatingTournamentId(seasonStart);

  try {
    const res = await fetch(
      `https://api.rating.chgk.info/tournaments/${tournamentId}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) {
      return NextResponse.json({ dateLabel: null });
    }
    const t = (await res.json()) as {
      dateStart?: string;
      dateEnd?: string;
    };
    if (!t.dateStart || !t.dateEnd) {
      return NextResponse.json({ dateLabel: null });
    }
    return NextResponse.json({
      dateLabel: formatOchpTournamentDateRange(t.dateStart, t.dateEnd),
    });
  } catch {
    return NextResponse.json({ dateLabel: null });
  }
}
