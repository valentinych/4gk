import { Clock, ExternalLink, MapPin, Navigation, UserPlus } from "lucide-react";
import Link from "next/link";
import { DS_LUNCH_ORDER_URL, DS_VENUES_2026 } from "@/lib/dziki-sopot-seasons";
import { DS_FRIDAY_SYNCS } from "@/lib/ds-friday-syncs";

const [DS_AQUAPARK_VENUE, DS_HOTEL_AQUA_VENUE] = DS_VENUES_2026;

interface ScheduleItem {
  time?: string;
  title: string;
  note?: string;
  link?: { href: string; label: string };
  ratingUrl?: string;
  joinHref?: string;
}

interface ScheduleVenue {
  name: string;
  mapUrl: string;
}

interface ScheduleBlock {
  title?: string;
  venue?: string;
  venueMapUrl?: string;
  venues?: ScheduleVenue[];
  items: ScheduleItem[];
  note?: string;
}

interface ScheduleDay {
  heading: string;
  blocks: ScheduleBlock[];
}

const DS_SCHEDULE_2026: ScheduleDay[] = [
  {
    heading: "4 сентября, пятница",
    blocks: [
      {
        title: "Dziki Start",
        venue: "Hotel Aqua Sopot — Destigo Hotels",
        venueMapUrl: DS_HOTEL_AQUA_VENUE.mapUrl,
        items: [
          {
            time: "18:00",
            title: "Рейтинговый синхрон «Островок Бесконечности: шестой Супервыпуск»",
            ratingUrl: DS_FRIDAY_SYNCS[0].ratingUrl,
            joinHref: `/calendar/${DS_FRIDAY_SYNCS[0].id}`,
          },
          {
            time: "18:00",
            title: "Рейтинговый синхрон «Чудове Чудовисько»",
            ratingUrl: DS_FRIDAY_SYNCS[1].ratingUrl,
            joinHref: `/calendar/${DS_FRIDAY_SYNCS[1].id}`,
          },
        ],
        note:
          "Оплата: 25 zł / 5 EUR с человека (на месте наличными). Обязательная регистрация. Очень просим заявиться не позднее 14:00 четверга 3 сентября (в этот раз число мест ограничено!).",
      },
    ],
  },
  {
    heading: "5 сентября, суббота",
    blocks: [
      {
        title: "Dziki Dzień",
        venue: "Aquapark Sopot (ресторан)",
        venueMapUrl: DS_AQUAPARK_VENUE.mapUrl,
        items: [
          { time: "10:50", title: "Открытие турнира" },
          { time: "11:00", title: "ЧГК 1–3 туры (1–45)" },
          {
            time: "14:00",
            title: "Обед",
            note: "заявки до 30.08.2026",
            link: { href: DS_LUNCH_ORDER_URL, label: "Заказать обед" },
          },
        ],
      },
      {
        title: "Dziki dzwięk",
        venues: [
          {
            name: "Hotel Aqua Sopot — Destigo Hotels",
            mapUrl: DS_HOTEL_AQUA_VENUE.mapUrl,
          },
          {
            name: "Aquapark Sopot (ресторан)",
            mapUrl: DS_AQUAPARK_VENUE.mapUrl,
          },
        ],
        items: [
          {
            time: "15:00–17:00",
            title: "Брейн-ринг для первых 20 команд ЧГК",
          },
          {
            time: "17:00–19:00",
            title: "Брейн-ринг для команд с 21 места ЧГК",
          },
        ],
      },
      {
        title: "Dzika Czerń",
        venue: "Aquapark Sopot (ресторан)",
        venueMapUrl: DS_AQUAPARK_VENUE.mapUrl,
        items: [{ time: "19:30", title: "Квиз с элементами чернухи" }],
      },
      {
        title: "Dzika Noc",
        items: [{ time: "21:30", title: "Свободное от игр время" }],
      },
    ],
  },
  {
    heading: "6 сентября, воскресенье",
    blocks: [
      {
        title: "Dzikie Jutro",
        venue: "Aquapark Sopot (ресторан)",
        venueMapUrl: DS_AQUAPARK_VENUE.mapUrl,
        items: [
          { time: "10:30", title: "ЧГК 4–7 туры (46–105)" },
          {
            time: "14:30",
            title: "Возможная перестрелка, закрытие, награждение",
          },
          {
            time: "15:30",
            title: "Завершение турнира",
            note: "обед для желающих (по заказу) после награждения",
          },
        ],
      },
    ],
  },
];

function VenueLink({ name, mapUrl }: ScheduleVenue) {
  return (
    <a
      href={mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-0.5 inline-flex items-center gap-1 text-xs text-accent hover:underline"
    >
      <MapPin className="h-3 w-3" />
      {name}
      <ExternalLink className="h-3 w-3 opacity-60" />
    </a>
  );
}

function ScheduleItemRow({ item }: { item: ScheduleItem }) {
  return (
    <div className="flex gap-4 px-5 py-3.5">
      <div className="flex w-32 shrink-0 items-start gap-1.5">
        {item.time ? (
          <>
            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
            <span className="whitespace-nowrap font-mono text-xs font-semibold text-muted">
              {item.time}
            </span>
          </>
        ) : (
          <span className="w-full" />
        )}
      </div>
      <div className="min-w-0">
        {item.ratingUrl ? (
          <p className="text-sm font-medium">
            <a
              href={item.ratingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent hover:underline"
            >
              {item.title}
            </a>
          </p>
        ) : (
          <p className="text-sm font-medium">{item.title}</p>
        )}
        {item.note && <p className="mt-0.5 text-xs text-muted">{item.note}</p>}
        {(item.joinHref || item.link) && (
        <div className="mt-2 flex flex-wrap gap-2">
          {item.joinHref && (
            <Link
              href={item.joinHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Заявиться
            </Link>
          )}
          {item.link && (
            <a
              href={item.link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
            >
              {item.link.label}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

export function DsSchedulePage() {
  return (
    <div id="page-ds-schedule" className="space-y-6">
      <p className="text-sm text-muted">
        Предварительное расписание Dziki Sopot 2026. Уточнения — на месте и в каналах
        организаторов.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {DS_VENUES_2026.map((venue) => (
          <a
            key={venue.mapUrl}
            href={venue.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-amber-200 hover:bg-amber-50/40"
          >
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">
                {venue.name}
                {venue.subtitle && (
                  <span className="font-normal text-muted"> ({venue.subtitle})</span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted">{venue.description}</p>
            </div>
            <Navigation className="h-4 w-4 shrink-0 text-muted" />
          </a>
        ))}
      </div>

      {DS_SCHEDULE_2026.map((day) => (
        <div
          key={day.heading}
          className="overflow-hidden rounded-xl border border-border bg-surface"
        >
          <div className="border-b border-border bg-amber-50 px-5 py-3">
            <h2 className="text-sm font-bold text-amber-900">{day.heading}</h2>
          </div>

          {day.blocks.map((block, blockIdx) => (
            <div
              key={`${day.heading}-${block.title ?? blockIdx}`}
              className={blockIdx > 0 ? "border-t border-border" : ""}
            >
              {(block.title || block.venue || block.venues) && (
                <div className="border-b border-border/60 bg-surface/80 px-5 py-2.5">
                  {block.title && (
                    <p className="text-sm font-semibold">{block.title}</p>
                  )}
                  {block.venues ? (
                    <div className="flex flex-col items-start">
                      {block.venues.map((venue) => (
                        <VenueLink key={venue.mapUrl} {...venue} />
                      ))}
                    </div>
                  ) : block.venue ? (
                    block.venueMapUrl ? (
                      <VenueLink name={block.venue} mapUrl={block.venueMapUrl} />
                    ) : (
                      <p className="text-xs text-muted">{block.venue}</p>
                    )
                  ) : null}
                </div>
              )}

              <div className="divide-y divide-border">
                {block.items.map((item, itemIdx) => (
                  <ScheduleItemRow key={`${item.time}-${item.title}-${itemIdx}`} item={item} />
                ))}
              </div>

              {block.note && (
                <div className="border-t border-border bg-amber-50/50 px-5 py-3.5 text-xs leading-relaxed text-muted">
                  <p>{block.note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      <p className="text-center text-xs text-muted">
        <Link href="/dziki-sopot" className="text-accent hover:underline">
          ← Назад к Dziki Sopot
        </Link>
      </p>
    </div>
  );
}
