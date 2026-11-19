import { Check, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import {
  displayedTechnicalRating,
  fetchOchbTechnicalRatings,
  fetchPlayerBaseRatings,
  technicalRatingFromPlayerRatings,
} from "@/lib/ochb-technical-rating";
import {
  OCHB_EVENT_ID,
  OCHB_TEAMS,
  type OchbTeam,
  ochbEventTeamChgkId,
  ochbRatingPublicUrl,
} from "@/lib/ochb";

interface SubmittedRoster {
  teamIds: Set<number>;
  /** Player rating ids of the latest roster for that storage team id. */
  playerIdsByTeam: Map<number, number[]>;
}

/** A roster is submitted once TeamRoster exists (POST requires ≥1 player). */
async function loadSubmittedRosters(): Promise<SubmittedRoster> {
  const empty: SubmittedRoster = { teamIds: new Set(), playerIdsByTeam: new Map() };
  if (!process.env.DATABASE_URL) return empty;
  try {
    const rosters = await db.teamRoster.findMany({
      where: { eventId: OCHB_EVENT_ID },
      select: {
        teamChgkId: true,
        updatedAt: true,
        players: { select: { chgkId: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    });
    const teamIds = new Set<number>();
    const playerIdsByTeam = new Map<number, number[]>();
    for (const roster of rosters) {
      const teamId = roster.teamChgkId;
      if (teamId == null || teamId === 0) continue;
      teamIds.add(teamId);
      if (playerIdsByTeam.has(teamId)) continue;
      playerIdsByTeam.set(
        teamId,
        roster.players
          .map((player) => player.chgkId)
          .filter((id): id is number => id != null && id > 0),
      );
    }
    return { teamIds, playerIdsByTeam };
  } catch {
    return empty;
  }
}

function hasRatingTeamId(team: OchbTeam): boolean {
  return team.teamChgkId != null && team.teamChgkId > 0;
}

/** Soft wash: highest on the page is green, middle yellow, lowest red. */
function ratingRowWash(value: number, min: number, max: number): string {
  const t = max === min ? 1 : (value - min) / (max - min);
  const hue = Math.round(t * 120);
  return `color-mix(in srgb, hsl(${hue} 70% 45%) 24%, var(--surface))`;
}

export async function OchbParticipantsPage() {
  const [rosters, technicalByTeam] = await Promise.all([
    loadSubmittedRosters(),
    fetchOchbTechnicalRatings(),
  ]);
  const rosterPlayerIds = OCHB_TEAMS.filter((team) => !hasRatingTeamId(team)).flatMap(
    (team) => rosters.playerIdsByTeam.get(ochbEventTeamChgkId(team)) ?? [],
  );
  const playerBaseRatings = await fetchPlayerBaseRatings(rosterPlayerIds);
  const ratingOf = (team: OchbTeam): number | undefined => {
    if (team.teamChgkId != null && team.teamChgkId > 0) {
      return technicalByTeam.get(team.teamChgkId);
    }
    const playerIds = rosters.playerIdsByTeam.get(ochbEventTeamChgkId(team)) ?? [];
    if (playerIds.length === 0) return undefined;
    const ratings = playerIds
      .map((id) => playerBaseRatings.get(id))
      .filter((rating): rating is number => rating != null);
    return technicalRatingFromPlayerRatings(ratings) ?? undefined;
  };
  const displayedOf = (team: OchbTeam): number | undefined => {
    const sum = ratingOf(team);
    return sum == null ? undefined : displayedTechnicalRating(sum);
  };
  const displayedRatings = OCHB_TEAMS.map(displayedOf).filter(
    (value): value is number => value != null,
  );
  const ratingMin = displayedRatings.length === 0 ? 0 : Math.min(...displayedRatings);
  const ratingMax = displayedRatings.length === 0 ? 0 : Math.max(...displayedRatings);
  const teams = [...OCHB_TEAMS].sort((a, b) => {
    const ra = displayedOf(a);
    const rb = displayedOf(b);
    if (ra != null && rb != null && ra !== rb) return rb - ra;
    if ((ra == null) !== (rb == null)) return ra == null ? 1 : -1;
    return a.number - b.number;
  });

  return (
    <div id="page-ochb-participants" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Всего команд: <strong>{teams.length}</strong>
        </p>
        <a
          href={ochbRatingPublicUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-accent hover:underline"
        >
          rating.chgk.info <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-16 text-center">
          <p className="text-base font-medium text-muted/60">
            Список команд пока пуст
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <th className="w-10 px-3 py-2.5 text-left font-medium">№</th>
                <th className="px-3 py-2.5 text-left font-medium">Команда</th>
                <th
                  className="w-14 px-1.5 py-2.5 text-center font-medium"
                  title="Подан состав"
                >
                  Состав
                </th>
                <th className="px-3 py-2.5 text-right font-medium">
                  Технический{" "}
                  <span className="whitespace-nowrap">рейтинг*</span>
                </th>
                <th className="px-3 py-2.5 text-left font-medium">Город</th>
                <th className="px-3 py-2.5 text-left font-medium">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {teams.map((t) => {
                const hasRoster = rosters.teamIds.has(ochbEventTeamChgkId(t));
                const technical = displayedOf(t);
                const wash =
                  technical == null ? undefined : ratingRowWash(technical, ratingMin, ratingMax);
                return (
                  <tr
                    key={t.number}
                    className={wash ? undefined : "hover:bg-surface/50"}
                    style={wash ? { backgroundColor: wash } : undefined}
                  >
                    <td className="px-3 py-2.5 font-mono text-muted">{t.number}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                      {t.teamChgkId ? (
                        <a
                          href={`https://rating.chgk.info/teams/${t.teamChgkId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-accent hover:underline"
                        >
                          {t.name}
                        </a>
                      ) : (
                        t.name
                      )}
                    </td>
                    <td className="px-1.5 py-2.5 text-center">
                      {hasRoster ? (
                        <span
                          className="inline-flex justify-center"
                          role="img"
                          title="Состав подан"
                          aria-label="Состав подан"
                        >
                          <Check className="h-4 w-4 text-green-600" aria-hidden />
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-muted">
                      {technical == null ? "—" : technical}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted">{t.city}</td>
                    <td className="px-3 py-2.5 font-mono text-muted">
                      {t.teamChgkId ? (
                        <a
                          href={`https://rating.chgk.info/teams/${t.teamChgkId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          {t.teamChgkId}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-muted">
        Технический рейтинг* — сумма рейтингов пяти сильнейших игроков состава с
        весами 1, 0,8, 0,6, 0,4 и 0,2, делённая на 10 и округлённая до целого.
        Шестой и остальные игроки не учитываются. Если в составе меньше пяти
        человек, берутся веса с начала ряда.
      </p>
    </div>
  );
}
