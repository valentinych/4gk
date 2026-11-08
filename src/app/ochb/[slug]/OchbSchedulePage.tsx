import { Clock } from "lucide-react";
import { OCHB_CHANNEL_URL, OCHB_SCHEDULE } from "@/lib/ochb";

export function OchbSchedulePage() {
  return (
    <div id="page-ochb-schedule" className="space-y-6">
      <p className="text-sm text-muted">
        Программа фестиваля. Уточнения — в{" "}
        <a
          href={OCHB_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          канале ОЧБ
        </a>
        .
      </p>

      {OCHB_SCHEDULE.map((day) => (
        <div
          key={day.heading}
          className="overflow-hidden rounded-xl border border-border bg-surface"
        >
          <div className="border-b border-border bg-sky-50 px-5 py-3">
            <h2 className="text-sm font-bold text-sky-900">{day.heading}</h2>
          </div>
          <div className="divide-y divide-border">
            {day.items.map((item) => (
              <div key={`${item.time}-${item.title}`} className="flex gap-4 px-5 py-3.5">
                <div className="flex w-32 shrink-0 items-start gap-1.5">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="whitespace-nowrap font-mono text-xs font-semibold text-muted">
                    {item.time}
                  </span>
                </div>
                <p className="min-w-0 text-sm font-medium">{item.title}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
