import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  fetchPlayerCurrentTeam,
  fetchTeamRosterInfo,
  type ChgkPlayer,
} from "@/lib/chgk";
import RosterForm from "./RosterForm";

type Props = { params: Promise<{ eventId: string }> };

export interface SuggestedTeamData {
  teamId: number;
  teamName: string;
  city: string | null;
  basePlayers: ChgkPlayer[];
  recentPlayers: ChgkPlayer[];
}

export default async function RosterPage({ params }: Props) {
  const { eventId } = await params;

  // Explicitly read cookies before getServerSession — required in Next.js 15+
  // where cookies() is async and getServerSession may otherwise see an empty jar.
  await cookies();

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent(`/account/roster/${eventId}`);
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="mb-6 text-lg">Войдите, чтобы подать состав команды.</p>
        <Link
          href={`/auth/signin?callbackUrl=${callbackUrl}`}
          className="rounded-xl bg-accent px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Войти через Google
        </Link>
      </main>
    );
  }

  const [event, existingRoster] = await Promise.all([
    db.calendarEvent.findUnique({ where: { id: eventId } }),
    db.teamRoster.findUnique({
      where: { eventId_userId: { eventId, userId: session.user.id } },
      include: { players: { orderBy: { sortOrder: "asc" } } },
    }),
  ]);

  // If no existing roster and user has a rating chgkId → pre-suggest their team
  let suggestedTeamData: SuggestedTeamData | null = null;
  if (!existingRoster && session.user.chgkId) {
    try {
      const currentTeam = await fetchPlayerCurrentTeam(session.user.chgkId);
      if (currentTeam) {
        const rosterInfo = await fetchTeamRosterInfo(
          currentTeam.teamId,
          currentTeam.currentSeasonId,
        );
        suggestedTeamData = {
          teamId: currentTeam.teamId,
          teamName: currentTeam.teamName,
          city: currentTeam.city ?? null,
          basePlayers: rosterInfo.basePlayers,
          recentPlayers: rosterInfo.recentPlayers,
        };
      }
    } catch {
      // Suggestion is optional — ignore errors from the rating API
    }
  }

  return (
    <RosterForm
      eventId={eventId}
      event={
        event
          ? {
              id: event.id,
              title: event.title,
              startDate: event.startDate.toISOString(),
              city: event.city,
            }
          : null
      }
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
    />
  );
}
