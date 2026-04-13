import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import RosterForm from "./RosterForm";

type Props = { params: Promise<{ eventId: string }> };

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
    />
  );
}
