import { NextResponse } from "next/server";
import {
  isArchiveYear,
  parseDsYear,
  resolveDsTournamentId,
} from "@/lib/dziki-sopot-seasons";
import { formatOchpTournamentDateRange } from "@/lib/ochp-seasons";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = parseDsYear(searchParams.get("year"));

  if (!year || !isArchiveYear(year)) {
    return NextResponse.json({ dateLabel: null });
  }

  const tournamentId = resolveDsTournamentId(year);

  try {
    const res = await fetch(
      `https://api.rating.chgk.info/tournaments/${tournamentId}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return NextResponse.json({ dateLabel: null });
    const t = (await res.json()) as { dateStart?: string; dateEnd?: string };
    if (!t.dateStart || !t.dateEnd) return NextResponse.json({ dateLabel: null });
    return NextResponse.json({
      dateLabel: formatOchpTournamentDateRange(t.dateStart, t.dateEnd),
    });
  } catch {
    return NextResponse.json({ dateLabel: null });
  }
}
