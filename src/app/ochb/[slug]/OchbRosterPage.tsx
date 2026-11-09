import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchPlayerCurrentTeam, fetchTeamRosterInfo } from "@/lib/chgk";
import {
  OCHB,
  OCHB_EVENT_ID,
  OCHB_TEAMS,
  ensureOchbEvent,
  listOchbParticipants,
  ochbEventTeamChgkId,
  type OchbTeam,
} from "@/lib/ochb";
import RosterForm, {
  type PresetRosterTeam,
  type SuggestedTeamData,
} from "@/app/account/roster/[eventId]/RosterForm";

function presetTeamsOf(teams: readonly OchbTeam[]): PresetRosterTeam[] {
  return teams.map((t) => ({
    teamChgkId: ochbEventTeamChgkId(t),
    teamName: t.name,
    city: t.city,
    number: t.number,
  }));
}

export async function OchbRosterPage() {
  await cookies();
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent("/ochb/roster");
    return (
      <div
        id="page-ochb-roster-signin"
        className="rounded-xl border border-border bg-surface p-6 text-center"
      >
        <p className="mb-6 text-sm text-muted">Войдите, чтобы подать состав команды.</p>
        <Link
          href={`/auth/signin?callbackUrl=${callbackUrl}`}
          className="inline-block rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Войти через Google
        </Link>
      </div>
    );
  }

  if (!session.user.chgkId) {
    return (
      <div
        id="page-ochb-roster-no-chgk"
        className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950"
      >
        <p>
          Чтобы подать состав, привяжите свой ID игрока с{" "}
          <a
            href="https://rating.chgk.info"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
          >
            rating.chgk.info
          </a>{" "}
          в профиле 4gk.
        </p>
        <Link href="/account" className="mt-4 inline-block text-accent hover:underline">
          Перейти в профиль
        </Link>
      </div>
    );
  }

  let event: { id: string; title: string; startDate: Date; city: string | null } | null = null;
  let existingRoster: {
    teamName: string;
    teamChgkId: number | null;
    city: string | null;
    players: {
      id: string;
      chgkId: number | null;
      lastName: string;
      firstName: string;
      patronymic: string | null;
      isCaptain: boolean;
      isBase: boolean;
      sortOrder: number;
    }[];
  } | null = null;
  let teams: OchbTeam[] = [...OCHB_TEAMS];

  if (process.env.DATABASE_URL) {
    try {
      await ensureOchbEvent();
      const [found, roster, fromDb] = await Promise.all([
        db.calendarEvent.findUnique({ where: { id: OCHB_EVENT_ID } }),
        db.teamRoster.findUnique({
          where: { eventId_userId: { eventId: OCHB_EVENT_ID, userId: session.user.id } },
          include: { players: { orderBy: { sortOrder: "asc" } } },
        }),
        listOchbParticipants(),
      ]);
      event = found;
      existingRoster = roster;
      if (fromDb.length > 0) teams = fromDb;
    } catch {
      teams = [...OCHB_TEAMS];
    }
  }

  const presetTeams = presetTeamsOf(teams);
  const allowedIds = new Set(presetTeams.map((t) => t.teamChgkId));

  let suggestedTeamData: SuggestedTeamData | null = null;
  if (!existingRoster && session.user.chgkId) {
    try {
      const currentTeam = await fetchPlayerCurrentTeam(session.user.chgkId);
      if (currentTeam && allowedIds.has(currentTeam.teamId)) {
        const rosterInfo = await fetchTeamRosterInfo(currentTeam.teamId);
        suggestedTeamData = {
          teamId: currentTeam.teamId,
          teamName: currentTeam.teamName,
          city: currentTeam.city ?? null,
          basePlayers: rosterInfo.basePlayers,
          recentPlayers: rosterInfo.recentPlayers,
          currentSeasonFilled: rosterInfo.currentSeasonFilled,
        };
      }
    } catch {
      // Suggestion is optional — ignore errors from the rating API
    }
  }

  return (
    <div id="page-ochb-roster" className="space-y-4">
      <p className="text-sm text-muted">
        Выберите любую из {presetTeams.length} команд ОЧБ и укажите состав. Подать может
        любой вошедший игрок с ID rating.chgk.info — не только капитан.
      </p>
      <RosterForm
        eventId={OCHB_EVENT_ID}
        event={{
          id: event?.id ?? OCHB.id,
          title: event?.title ?? OCHB.longTitle,
          startDate: (event?.startDate ?? OCHB.startDate).toISOString(),
          city: event?.city ?? OCHB.city,
        }}
        initialRoster={
          existingRoster
            ? {
                teamName: existingRoster.teamName,
                teamChgkId: existingRoster.teamChgkId,
                city: existingRoster.city,
                players: existingRoster.players.map((p) => ({
                  id: p.id,
                  chgkId: p.chgkId,
                  lastName: p.lastName,
                  firstName: p.firstName,
                  patronymic: p.patronymic,
                  isCaptain: p.isCaptain,
                  isBase: p.isBase,
                  sortOrder: p.sortOrder,
                })),
              }
            : null
        }
        suggestedTeamData={suggestedTeamData}
        presetTeams={presetTeams}
        embedded
      />
    </div>
  );
}
