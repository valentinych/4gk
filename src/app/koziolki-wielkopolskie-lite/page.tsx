import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, Image as ImageIcon, MapPin, Medal, Sparkles, Trophy } from "lucide-react";
import {
  KOZIOLKI_LITE,
  KOZIOLKI_SCHEDULE,
  KOZIOLKI_KSI,
  KOZIOLKI_BRAIN_GROUPS,
  KOZIOLKI_BRAIN_FINAL,
  KOZIOLKI_CHGK,
  KOZIOLKI_MEDALS,
} from "@/lib/koziolki-lite";

const MEDAL_EMOJI = ["🥇", "🥈", "🥉"];

export const metadata: Metadata = {
  title: `${KOZIOLKI_LITE.title} | 4GK.pl`,
  description: `Любительский турнир в Познани, ${KOZIOLKI_LITE.date}. Архив результатов: КСИ, ЧГК, Брейн-ринг.`,
};

export default function KoziolkiPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link
        href="/amateur"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Любительские турниры
      </Link>

      <div className="mb-10">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
          <Sparkles className="h-3.5 w-3.5" />
          Архив · прошедший турнир
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          🐐 {KOZIOLKI_LITE.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Любительский турнир в Познани.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <CalendarDays className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Дата</p>
              <p className="text-sm font-bold">{KOZIOLKI_LITE.date}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface">
              <MapPin className="h-4 w-4 text-muted" />
            </div>
            <div>
              <p className="text-xs text-muted">Место</p>
              <a
                href={KOZIOLKI_LITE.venueMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-bold hover:text-accent transition-colors"
              >
                {KOZIOLKI_LITE.city}, {KOZIOLKI_LITE.venue}
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold tracking-tight">📌 Расписание</h2>
        <div className="rounded-xl border border-border bg-surface p-5">
          <ul className="space-y-2.5">
            {KOZIOLKI_SCHEDULE.map((item) => (
              <li
                key={`${item.time}-${item.title}`}
                className="flex items-baseline gap-3 text-sm leading-snug"
              >
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                  {item.time}
                </span>
                <div className="min-w-0">
                  <span className="font-medium">{item.title}</span>
                  {item.note && (
                    <span className="ml-1 text-xs text-muted">({item.note})</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Medal className="h-5 w-5 text-amber-500" />
          Призёры
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {KOZIOLKI_MEDALS.map((cat, idx) => (
            <div
              key={`${cat.category}-${cat.note ?? ""}-${idx}`}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <div className="mb-3">
                <h3 className="text-sm font-bold leading-snug">{cat.category}</h3>
                {cat.note && (
                  <p className="text-xs text-muted">{cat.note}</p>
                )}
              </div>
              <ol className="space-y-1.5">
                {cat.medalists.map((m, mIdx) => (
                  <li key={`${m.team}-${mIdx}`} className="flex items-baseline gap-2 text-sm">
                    <span className="text-base leading-none" aria-hidden>
                      {MEDAL_EMOJI[mIdx] ?? ""}
                    </span>
                    <span className="font-medium">{m.team}</span>
                    {m.city && (
                      <span className="text-xs text-muted">({m.city})</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Trophy className="h-5 w-5 text-accent" />
          ЧГК · итоги
        </h2>
        <p className="mb-3 text-xs text-muted">
          72 вопроса с двух синхронов: B-52: S01E08 и Островок Бесконечности (5-й Супервыпуск).
        </p>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Команда</th>
                <th className="px-3 py-2 text-left font-semibold">Город</th>
                <th className="px-3 py-2 text-right font-semibold">Очки / 72</th>
                <th className="px-3 py-2 text-right font-semibold">Рейтинг</th>
              </tr>
            </thead>
            <tbody>
              {KOZIOLKI_CHGK.map((row) => (
                <tr key={row.place} className="border-t border-border/50">
                  <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted">
                    {row.place}
                  </td>
                  <td className="px-3 py-2 font-medium">{row.team}</td>
                  <td className="px-3 py-2 text-muted">{row.city}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{row.score}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">
                    {row.ratingPoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Trophy className="h-5 w-5 text-accent" />
          Командная «Своя игра» · итоги
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Команда</th>
                <th className="px-3 py-2 text-right font-semibold">Блок 1</th>
                <th className="px-3 py-2 text-right font-semibold">Блок 2</th>
                <th className="px-3 py-2 text-right font-semibold">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {KOZIOLKI_KSI.map((row) => (
                <tr key={row.place} className="border-t border-border/50">
                  <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted">
                    {row.place}
                  </td>
                  <td className="px-3 py-2 font-medium">{row.team}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">
                    {row.block1}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">
                    {row.block2}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums">
                    {row.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
          <Trophy className="h-5 w-5 text-accent" />
          Брейн-ринг · группы
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {KOZIOLKI_BRAIN_GROUPS.map((group) => (
            <div key={group.name} className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="border-b border-border bg-zinc-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {group.name}
              </div>
              <table className="w-full text-xs">
                <thead className="bg-zinc-50/50 text-[10px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-2 py-1.5 text-left">#</th>
                    <th className="px-2 py-1.5 text-left">Команда</th>
                    <th className="px-2 py-1.5 text-right" title="Игры">И</th>
                    <th className="px-2 py-1.5 text-right" title="Победы">В</th>
                    <th className="px-2 py-1.5 text-right" title="Ничьи">Н</th>
                    <th className="px-2 py-1.5 text-right" title="Поражения">П</th>
                    <th className="px-2 py-1.5 text-right" title="Очки">О</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row) => (
                    <tr key={row.team} className="border-t border-border/50">
                      <td className="px-2 py-1.5 font-mono tabular-nums text-muted">{row.place}</td>
                      <td className="px-2 py-1.5 font-medium">{row.team}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.played}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.wins}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.draws}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">{row.losses}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold tabular-nums">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-900">
            Финал
          </div>
          <table className="w-full text-sm">
            <tbody>
              {KOZIOLKI_BRAIN_FINAL.map((row, idx) => (
                <tr key={row.team} className="border-t border-border/50 first:border-t-0">
                  <td className="px-3 py-2 font-mono text-xs tabular-nums text-muted">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium">{row.team}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {row.wins}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight">
          <ImageIcon className="h-5 w-5 text-accent" />
          Фотоальбом · награждение
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <iframe
            src={`https://drive.google.com/embeddedfolderview?id=${KOZIOLKI_LITE.photoAlbumFolderId}#grid`}
            title="Фотоальбом награждения"
            className="block h-[600px] w-full border-0"
            loading="lazy"
          />
        </div>
        <a
          href={KOZIOLKI_LITE.photoAlbumUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
        >
          Открыть альбом в Google Drive
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </section>
    </div>
  );
}
