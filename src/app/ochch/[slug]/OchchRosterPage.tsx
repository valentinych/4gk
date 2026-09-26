"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { GuestJoinForm } from "@/components/calendar/GuestJoinForm";
import { OCHCH_EVENT_ID } from "@/lib/ochch";

export function OchchRosterPage() {
  const { data: session } = useSession();
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div
        id="page-ochch-roster-success"
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900"
      >
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <CheckCircle2 className="h-5 w-5" />
          Состав подан
        </div>
        <p>Заявка состава на ОЧЧ-2026 сохранена.</p>
        <Link href="/ochch" className="mt-4 inline-block text-accent hover:underline">
          ← Назад к ОЧЧ
        </Link>
      </div>
    );
  }

  return (
    <div id="page-ochch-roster" className="space-y-4">
      <p className="text-sm text-muted">
        Укажите команду и состав на чемпионат 3–4 октября.
      </p>
      <GuestJoinForm
        eventId={OCHCH_EVENT_ID}
        telegramRequired={!session?.user?.chgkId}
        heading="Состав на ОЧЧ-2026"
        submitLabel="Подать состав"
        requireRoster
        onSuccess={() => setDone(true)}
      />
    </div>
  );
}
