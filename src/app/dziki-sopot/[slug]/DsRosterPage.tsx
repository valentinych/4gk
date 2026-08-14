"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { GuestJoinForm } from "@/components/calendar/GuestJoinForm";
import { DS_MAIN_EVENT_ID } from "@/lib/dziki-sopot-seasons";
import { DS_FRIDAY_SYNCS } from "@/lib/ds-friday-syncs";

export type DsRosterVariant = "main" | "ostrovok" | "chudove";

const ROSTER_PAGES: Record<
  DsRosterVariant,
  {
    eventId: string;
    heading: string;
    description: string;
    success: string;
    copyToSyncs: boolean;
  }
> = {
  main: {
    eventId: DS_MAIN_EVENT_ID,
    heading: "Состав на Dziki Sopot 2026",
    description:
      "Укажите команду и состав на двухдневный турнир 5–6 сентября. Внизу можно отметить пятничные синхроны — туда уйдёт тот же состав.",
    success:
      "Заявка на двухдневный турнир сохранена. Если вы отметили синхроны — состав скопирован и туда.",
    copyToSyncs: true,
  },
  ostrovok: {
    eventId: DS_FRIDAY_SYNCS[0].id,
    heading: `Состав на «${DS_FRIDAY_SYNCS[0].title}»`,
    description: "Укажите команду и состав на пятничный синхрон 4 сентября.",
    success: "Состав на синхрон сохранён.",
    copyToSyncs: false,
  },
  chudove: {
    eventId: DS_FRIDAY_SYNCS[1].id,
    heading: `Состав на «${DS_FRIDAY_SYNCS[1].title}»`,
    description: "Укажите команду и состав на пятничный синхрон 4 сентября.",
    success: "Состав на синхрон сохранён.",
    copyToSyncs: false,
  },
};

export function DsRosterPage({ variant = "main" }: { variant?: DsRosterVariant }) {
  const { data: session } = useSession();
  const [done, setDone] = useState(false);
  const page = ROSTER_PAGES[variant];

  if (done) {
    return (
      <div
        id="page-ds-roster-success"
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900"
      >
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-5 w-5" />
          Состав подан
        </div>
        <p>{page.success}</p>
        <Link href="/dziki-sopot" className="mt-4 inline-block text-accent hover:underline">
          ← Назад к Dziki Sopot
        </Link>
      </div>
    );
  }

  return (
    <div id="page-ds-roster" className="space-y-4">
      <p className="text-sm text-muted">{page.description}</p>
      <GuestJoinForm
        eventId={page.eventId}
        telegramRequired={!session?.user?.chgkId}
        heading={page.heading}
        submitLabel="Подать состав"
        requireRoster
        copyToEvents={
          page.copyToSyncs
            ? DS_FRIDAY_SYNCS.map((s) => ({ id: s.id, label: s.title }))
            : []
        }
        onSuccess={() => setDone(true)}
      />
    </div>
  );
}
