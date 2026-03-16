import { Calendar, MapPin, Users, Trophy } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Чемпионат Варшавы",
  description: "Чемпионат Варшавы по интеллектуальным играм",
};

export default function WarsawPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Trophy className="h-3.5 w-3.5" />
          Лига
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Чемпионат Варшавы</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Регулярный чемпионат по интеллектуальным играм среди команд Варшавы.
          Сезон состоит из серии туров, по итогам которых определяется чемпион.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <MapPin className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Город</p>
              <p className="text-sm font-bold">Варшава</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <Calendar className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Сезон</p>
              <p className="text-sm font-bold">2025/2026</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <Users className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Команды</p>
              <p className="text-sm font-bold">Скоро</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-16 text-center">
        <p className="text-base font-medium text-muted/60">Результаты и турнирная таблица</p>
        <p className="mt-2 text-sm text-muted/40">Данные появятся после начала сезона</p>
      </div>
    </div>
  );
}
