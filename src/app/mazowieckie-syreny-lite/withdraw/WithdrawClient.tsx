"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, X } from "lucide-react";

const TOKEN_KEY = "mazowieckie-syreny-lite:tokens";

function dropLocalToken(id: string) {
  if (typeof window === "undefined") return;
  try {
    const all = JSON.parse(localStorage.getItem(TOKEN_KEY) ?? "{}");
    delete all[id];
    localStorage.setItem(TOKEN_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function WithdrawClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const token = searchParams.get("token") ?? "";

  const [phase, setPhase] = useState<"confirm" | "submitting" | "done" | "error">(
    "confirm",
  );
  const [error, setError] = useState<string | null>(null);

  const valid = !!id && !!token;

  async function handleConfirm() {
    setPhase("submitting");
    setError(null);
    try {
      const res = await fetch(
        `/api/syreny-lite/teams/${id}?token=${encodeURIComponent(token)}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        dropLocalToken(id);
        setPhase("done");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Не удалось отозвать заявку");
      setPhase("error");
    } catch {
      setError("Ошибка сети");
      setPhase("error");
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <Link
        href="/mazowieckie-syreny-lite/participants"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Список команд
      </Link>

      <h1 className="mb-6 text-2xl font-bold tracking-tight">Отзыв заявки</h1>

      {!valid ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          Ссылка некорректна. Откройте ссылку отзыва, которую получили после заявки.
        </div>
      ) : phase === "done" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Заявка отозвана
          </div>
          <p>Команда удалена из списка участников.</p>
          <Link
            href="/mazowieckie-syreny-lite/participants"
            className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline"
          >
            Вернуться к списку команд
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-5 text-sm">
          <p className="mb-4 text-muted">
            Подтвердите отзыв заявки команды с турнира{" "}
            <strong className="text-foreground">Mazowieckie Syreny Lite</strong>.
          </p>
          {error && (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">
              {error}
            </p>
          )}
          <button
            onClick={handleConfirm}
            disabled={phase === "submitting"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {phase === "submitting" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Отозвать заявку
          </button>
          <Link
            href="/mazowieckie-syreny-lite/participants"
            className="ml-2 inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface"
          >
            Отмена
          </Link>
        </div>
      )}
    </div>
  );
}
