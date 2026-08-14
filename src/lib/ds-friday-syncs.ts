import { db } from "@/lib/db";
import { DS_MAIN_EVENT_ID, DS_VENUES_2026 } from "@/lib/dziki-sopot-seasons";

const hotelAqua = DS_VENUES_2026.find((v) => v.name.startsWith("Hotel Aqua"))!;

export const DS_FRIDAY_SYNC_CLOSES_AT = new Date("2026-09-03T12:00:00.000Z"); // 14:00 Warsaw

export interface DsFridaySyncDef {
  id: string;
  title: string;
  ratingUrl: string;
  description: string;
}

export const DS_FRIDAY_SYNCS: DsFridaySyncDef[] = [
  {
    id: "ds-2026-sync-ostrovok",
    title: "Островок Бесконечности: шестой Супервыпуск",
    ratingUrl: "https://rating.chgk.info/tournament/13404",
    description:
      "Рейтинговый синхрон Dziki Start. Hotel Aqua Sopot, 4 сентября 18:00. Оплата 25 zł / 5 EUR с человека наличными на месте. Заявки до 14:00 четверга 3 сентября.",
  },
  {
    id: "ds-2026-sync-chudove",
    title: "Чудове Чудовисько",
    ratingUrl: "https://rating.chgk.info/tournament/14015",
    description:
      "Рейтинговый синхрон Dziki Start. Hotel Aqua Sopot, 4 сентября 18:00. Оплата 25 zł / 5 EUR с человека наличными на месте. Заявки до 14:00 четверга 3 сентября.",
  },
];

const DS_FRIDAY_SYNC_IDS = new Set(DS_FRIDAY_SYNCS.map((s) => s.id));

export function isDsFridaySync(eventId: string): boolean {
  return DS_FRIDAY_SYNC_IDS.has(eventId);
}

export function allowsDsGuestJoin(eventId: string): boolean {
  return isDsFridaySync(eventId) || eventId === DS_MAIN_EVENT_ID;
}

export function dsFridaySyncById(eventId: string): DsFridaySyncDef | undefined {
  return DS_FRIDAY_SYNCS.find((s) => s.id === eventId);
}

/** Idempotent — creates the two Friday sync calendar events if missing. */
export async function ensureDsFridaySyncEvents() {
  await Promise.all(
    DS_FRIDAY_SYNCS.map(async (sync) => {
      const existing = await db.calendarEvent.findUnique({ where: { id: sync.id } });
      if (existing) return existing;
      return db.calendarEvent.create({
        data: {
          id: sync.id,
          title: sync.title,
          type: "sync-chgk",
          startDate: new Date(Date.UTC(2026, 8, 4)),
          startTime: "18:00",
          city: "Сопот",
          venue: hotelAqua.name,
          venueMapUrl: hotelAqua.mapUrl,
          description: sync.description,
          ratingUrl: sync.ratingUrl,
          registrationClosesAt: DS_FRIDAY_SYNC_CLOSES_AT,
        },
      });
    }),
  );
}
