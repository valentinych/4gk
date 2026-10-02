import { Clock, ExternalLink, MapPin, Navigation } from "lucide-react";
import {
  OCHCH_CHANNEL_URL,
  OCHCH_GOROD_GREKHOV_REG_URL,
  OCHCH_SI_EDITOR,
  OCHCH_SPY_TOUR_REG_URL,
  OCHCH_VENUE_IRIS,
  OCHCH_VENUE_MAIN,
} from "@/lib/ochch";

interface ScheduleItem {
  time: string;
  title: string;
  note?: string;
  editors?: string[];
  editorLabel?: string;
  /** First number in the editors list. ЧГК continues 1–7 across Saturday and Sunday. */
  editorStart?: number;
  regUrl?: string;
  regLabel?: string;
}

interface ScheduleDay {
  heading: string;
  venueName: string;
  venueAddress: string;
  venueMapUrl: string;
  venueNote?: string;
  items: ScheduleItem[];
}

const SCHEDULE: ScheduleDay[] = [
  {
    heading: "Пятница, 2 октября — доп. программа",
    venueName: OCHCH_VENUE_IRIS.name,
    venueAddress: OCHCH_VENUE_IRIS.address,
    venueMapUrl: OCHCH_VENUE_IRIS.mapUrl,
    venueNote: "Не основной зал чемпионата",
    items: [
      {
        time: "18:00",
        title: "Нуар-экскурсия «Шпионская Прага»",
        note: "Максим Кабир. Альтернатива «Городу грехов».",
        regUrl: OCHCH_SPY_TOUR_REG_URL,
        regLabel: "Регистрация",
      },
      {
        time: "18:30",
        title: "Город грехов - 2026: One Battle After Another",
        note: "Зал с 18:00; у входа ресторан и бар. До 26 команд.",
        editors: ["Голуб Эдуард", "Маландина Виктория"],
        editorLabel: "Редакторы",
        regUrl: OCHCH_GOROD_GREKHOV_REG_URL,
        regLabel: "Регистрация",
      },
    ],
  },
  {
    heading: "Суббота, 3 октября",
    venueName: OCHCH_VENUE_MAIN.name,
    venueAddress: OCHCH_VENUE_MAIN.address,
    venueMapUrl: OCHCH_VENUE_MAIN.mapUrl,
    items: [
      { time: "10:30–11:30", title: "Отбор на Свою Игру" },
      {
        time: "12:00–16:00*",
        title: "ЧГК — 4 тура по 15 вопросов",
        note: "* - возможно незначительное изменение времени окончания / начала",
        editorLabel: "Редакторы ЧГК",
        editors: [
          "Александр Рождествин",
          "Мария Иванова",
          "Тарас Вахрив",
          "Сборный тур Максима Еремеева и редакторов ОЧЧ",
        ],
      },
      {
        time: "17:45–20:15",
        title: "Тминное поле",
      },
      {
        time: "20:15*–22:30",
        title: "Музыкальный квиз",
        note: "Третий авторский музыкальный квиз от Андрея Ярмолы. * - возможно незначительное изменение времени окончания / начала",
      },
    ],
  },
  {
    heading: "Воскресенье, 4 октября",
    venueName: OCHCH_VENUE_MAIN.name,
    venueAddress: OCHCH_VENUE_MAIN.address,
    venueMapUrl: OCHCH_VENUE_MAIN.mapUrl,
    items: [
      {
        time: "9:00–11:30",
        title: "Своя игра (1/8 и 1/4, 1/2, финал)",
        note: `Редактор: ${OCHCH_SI_EDITOR}`,
      },
      {
        time: "12:00–15:00",
        title: "ЧГК — 3 тура по 15 вопросов",
        editorLabel: "Редакторы ЧГК",
        editorStart: 5,
        editors: [
          "Наиль Фарукшин",
          "Андрей Грищук - Ирина Данилюк",
          "Михаил Карпук",
        ],
      },
    ],
  },
];

export function OchchSchedulePage() {
  return (
    <div id="page-ochch-schedule" className="space-y-6">
      <p className="text-sm text-muted">
        Программа по анонсам{" "}
        <a
          href={OCHCH_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          канала ОЧЧ
        </a>
        . Уточнения — там же.
      </p>

      {SCHEDULE.map((day) => (
        <div
          key={day.heading}
          className="overflow-hidden rounded-xl border border-border bg-surface"
        >
          <div className="border-b border-border bg-sky-50 px-5 py-3">
            <h2 className="text-sm font-bold text-sky-900">{day.heading}</h2>
            {day.venueNote && (
              <p className="mt-0.5 text-xs text-sky-800/80">{day.venueNote}</p>
            )}
          </div>
          <a
            href={day.venueMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 border-b border-border px-5 py-3 transition-colors hover:bg-sky-50/40"
          >
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{day.venueName}</p>
              <p className="mt-0.5 text-xs text-muted">{day.venueAddress}</p>
            </div>
            <Navigation className="h-4 w-4 shrink-0 text-muted" />
          </a>
          <div className="divide-y divide-border">
            {day.items.map((item) => (
              <div key={`${item.time}-${item.title}`} className="flex gap-4 px-5 py-3.5">
                <div className="flex w-32 shrink-0 items-start gap-1.5">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="whitespace-nowrap font-mono text-xs font-semibold text-muted">
                    {item.time}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{item.title}</p>
                  {item.note && (
                    <p className="mt-0.5 text-xs text-muted">{item.note}</p>
                  )}
                  {item.editors && (
                    <div className="mt-1.5">
                      {item.editorLabel ? (
                        <p className="text-xs text-muted">{item.editorLabel}</p>
                      ) : null}
                      <ol className="mt-0.5 space-y-0.5">
                        {item.editors.map((name, ei) => (
                          <li key={name} className="text-xs text-muted">
                            <span className="font-mono text-muted/60">
                              {(item.editorStart ?? 1) + ei}.{" "}
                            </span>
                            {name}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {item.regUrl && (
                    <a
                      href={item.regUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-accent/90"
                    >
                      {item.regLabel ?? "РЕГИСТРАЦИЯ"}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
