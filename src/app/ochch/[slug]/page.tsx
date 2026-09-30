import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ChgkLiveBoard } from "@/components/ChgkLiveBoard";
import {
  OCHCH_CHGK_SHEET_URL,
  ensureOchchEvent,
} from "@/lib/ochch";
import { isPrismaMissingTable } from "@/lib/page-widgets";
import { OchchAppealPage } from "./OchchAppealPage";
import { OchchControversialPage } from "./OchchControversialPage";
import { OchchParticipantsPage } from "./OchchParticipantsPage";
import { OchchQuizPage } from "./OchchQuizPage";
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
  "results-quiz": "Музыкальный квиз",
  "results-si": "Результаты Своей игры",
  roster: "Подать состав — ОЧЧ-2026",
  controversial: "Спорные",
  appeals: "Апелляции",
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

export default async function OchchSlugPage({ params }: Props) {
  const { slug } = await params;

  if (process.env.DATABASE_URL) {
    try {
      await ensureOchchEvent();
    } catch (e) {
      if (!isPrismaMissingTable(e)) throw e;
    }
  }

  if (slug === "results-chgk") {
    return (
      <ChgkLiveBoard
        apiPath="/api/ochch"
        title="ОЧЧ-2026. Результаты Что? Где? Когда?"
        backHref="/ochch"
        backLabel="Назад к ОЧЧ"
        sheetUrl={OCHCH_CHGK_SHEET_URL}
        pageId="ochch-results"
        standingsToggles
      />
    );
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
      ) : slug === "results-tminnoe" ? (
        <ComingSoon hint="Таблица или трансляция появятся после игры — или их добавит администратор." />
      ) : slug === "results-quiz" ? (
        <OchchQuizPage />
      ) : slug === "results-si" ? (
        <ComingSoon hint="Результаты Своей игры появятся после финала — или их добавит администратор." />
      ) : slug === "appeals" ? (
        <OchchAppealPage />
      ) : slug === "controversial" ? (
        <OchchControversialPage />
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
