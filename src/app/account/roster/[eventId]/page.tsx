import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
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
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=/account/roster/${eventId}`);
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
        const rosterInfo = await fetchTeamRosterInfo(currentTeam.teamId);
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
