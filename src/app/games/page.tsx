import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Другие игры",
  description: "Другие интеллектуальные игры и турниры",
};

export default function GamesPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Другие игры</h1>
        <p className="mt-2 text-sm text-muted">
          Интеллектуальные игры и турниры, в которых можно принять участие
        </p>
      </div>

      <div className="space-y-4">
        {[
          {
            href: "/warsaw",
            title: "Чемпионат Варшавы",
            description: "Регулярный чемпионат по интеллектуальным играм среди команд Варшавы",
            badge: "Варшава",
            badgeColor: "bg-blue-50 text-blue-700 border-blue-100",
          },
          {
            href: "/ochp",
            title: "ОЧП",
            description: "Открытый чемпионат Польши — крупнейший национальный турнир",
            badge: "Польша",
            badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
          },
          {
            href: "/dziki-sopot",
            title: "Dziki Sopot",
            description: "Лига интеллектуальных игр в Сопоте",
            badge: "Сопот",
            badgeColor: "bg-amber-50 text-amber-700 border-amber-100",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center justify-between rounded-xl border border-border bg-white p-5 transition-all hover:border-border-hover hover:shadow-sm"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">{item.title}</h2>
                <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${item.badgeColor}`}>
                  {item.badge}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">{item.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-xl border-2 border-dashed border-border bg-surface/50 p-12 text-center">
        <p className="text-sm font-medium text-muted/60">Скоро здесь появятся новые турниры и лиги</p>
      </div>
    </div>
  );
}
