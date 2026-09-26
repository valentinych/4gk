import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ChgkRatingApiResults from "@/app/ochp/[slug]/ChgkRatingApiResults";
import {
  OCHCH_CHANNEL_URL,
  OCHCH_RATING_TOURNAMENT_ID,
  ensureOchchEvent,
} from "@/lib/ochch";
import { isPrismaMissingTable } from "@/lib/page-widgets";
import { OchchParticipantsPage } from "./OchchParticipantsPage";
import { OchchRosterPage } from "./OchchRosterPage";
import { OchchRulesPage } from "./OchchRulesPage";
import { OchchSchedulePage } from "./OchchSchedulePage";

type Props = {
  params: Promise<{ slug: string }>;
};

const PAGE_TITLES: Record<string, string> = {
  participants: "Участники ОЧЧ-2026",
  schedule: "Расписание ОЧЧ-2026",
  rules: "Положение ОЧЧ-2026",
  "results-chgk": "Результаты Что? Где? Когда?",
  "results-tminnoe": "Результаты «Тминное поле»",
  "results-si": "Результаты Своей игры",
  roster: "Подать состав — ОЧЧ-2026",
  controversial: "Спорный",
  appeals: "Апелляции на ЧГК",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: PAGE_TITLES[slug] ?? slug };
}

function ComingSoon({ hint }: { hint?: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-16 text-center">
      <p className="text-base font-medium text-muted/60">Содержимое появится скоро</p>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

function FormPlaceholder({ kind }: { kind: "спорный" | "апелляцию" }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Форма для {kind === "апелляцию" ? "апелляции" : "спорного"} ещё не опубликована.
        Пока пишите в{" "}
        <a
          href={OCHCH_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          канал ОЧЧ
        </a>
        . Администратор может заменить эту плитку на ссылку или таблицу.
      </p>
      <ComingSoon />
    </div>
  );
}

export default async function OchchSlugPage({ params }: Props) {
  const { slug } = await params;

  if (slug === "roster" && process.env.DATABASE_URL) {
    try {
      await ensureOchchEvent();
    } catch (e) {
      if (!isPrismaMissingTable(e)) throw e;
    }
  }

  const title = PAGE_TITLES[slug];

  return (
    <div id="page-ochch-slug" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href="/ochch"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад к ОЧЧ
      </Link>
      <div id="page-ochch-slug-header" className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {title ?? slug}
        </h1>
      </div>

      {slug === "schedule" ? (
        <OchchSchedulePage />
      ) : slug === "rules" ? (
        <OchchRulesPage />
      ) : slug === "participants" ? (
        <OchchParticipantsPage />
      ) : slug === "roster" ? (
        <OchchRosterPage />
      ) : slug === "results-chgk" ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Таблица из rating.chgk.info. Трансляцию ХаЗа администратор может добавить
            плиткой на главной ОЧЧ.
          </p>
          <ChgkRatingApiResults
            tournamentId={OCHCH_RATING_TOURNAMENT_ID}
            showChst={false}
          />
        </div>
      ) : slug === "results-tminnoe" ? (
        <ComingSoon hint="Таблица или трансляция появятся после игры — или их добавит администратор." />
      ) : slug === "results-si" ? (
        <ComingSoon hint="Результаты Своей игры появятся после финала — или их добавит администратор." />
      ) : slug === "appeals" ? (
        <FormPlaceholder kind="апелляцию" />
      ) : slug === "controversial" ? (
        <FormPlaceholder kind="спорный" />
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border bg-surface/50 p-16 text-center">
          <p className="text-base font-medium text-muted/60">Страница не найдена</p>
          <Link href="/ochch" className="mt-3 inline-block text-sm text-accent hover:underline">
            Вернуться к ОЧЧ
          </Link>
        </div>
      )}
    </div>
  );
}
