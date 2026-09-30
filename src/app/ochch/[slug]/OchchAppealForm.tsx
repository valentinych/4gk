"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type AppealKind = "REMOVE" | "CREDIT";

const KIND_LABELS: Record<AppealKind, string> = {
  REMOVE: "На снятие",
  CREDIT: "На зачёт",
};

const KINDS: AppealKind[] = ["REMOVE", "CREDIT"];

export type OchchSubmitTeamOption = {
  teamChgkId: number;
  label: string;
};

export function OchchAppealForm({
  teamOptions,
}: {
  teamOptions?: OchchSubmitTeamOption[];
}) {
  const router = useRouter();
  const [teamChgkId, setTeamChgkId] = useState("");
  const [kind, setKind] = useState<AppealKind | "">("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [argumentation, setArgumentation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedQuestion, setSavedQuestion] = useState<number | null>(null);
  const showTeamPicker = (teamOptions?.length ?? 0) > 0;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    if (!argumentation.trim()) {
      setError("Для Апелляций обоснование является обязательным");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSavedQuestion(null);

    try {
      const res = await fetch("/api/ochch/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          questionNumber: Number(question),
          answerText: answer,
          argumentation,
          ...(showTeamPicker ? { teamChgkId: Number(teamChgkId) } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { error?: string; questionNumber?: number }
        | null;
      if (!res.ok) {
        setError(data?.error || "Не удалось отправить");
        return;
      }
      setSavedQuestion(
        typeof data?.questionNumber === "number"
          ? data.questionNumber
          : Number(question),
      );
      setAnswer("");
      setArgumentation("");
      router.refresh();
    } catch {
      setError("Не удалось отправить");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      id="page-ochch-appeals-form"
      onSubmit={onSubmit}
      className="max-w-md space-y-4"
    >
      {showTeamPicker ? (
        <div>
          <label htmlFor="ochch-appeal-team" className="block text-sm font-medium">
            команда
          </label>
          <select
            id="ochch-appeal-team"
            name="teamChgkId"
            required
            value={teamChgkId}
            onChange={(e) => setTeamChgkId(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
          >
            <option value="" disabled>
              Выберите команду
            </option>
            {teamOptions!.map((t) => (
              <option key={t.teamChgkId} value={t.teamChgkId}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div>
        <label htmlFor="ochch-appeal-kind" className="block text-sm font-medium">
          Вид
        </label>
        <select
          id="ochch-appeal-kind"
          name="kind"
          required
          value={kind}
          onChange={(e) => setKind(e.target.value as AppealKind | "")}
          className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
        >
          <option value="" disabled>
            Выберите вид
          </option>
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="ochch-appeal-question" className="block text-sm font-medium">
          номер вопроса
        </label>
        <input
          id="ochch-appeal-question"
          name="questionNumber"
          type="number"
          inputMode="numeric"
          required
          min={1}
          max={105}
          step={1}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      </div>
      <div>
        <label htmlFor="ochch-appeal-answer" className="block text-sm font-medium">
          текст ответа
        </label>
        <input
          id="ochch-appeal-answer"
          name="answerText"
          type="text"
          required
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      </div>
      <div>
        <label htmlFor="ochch-appeal-argumentation" className="block text-sm font-medium">
          Аргументация
        </label>
        <textarea
          id="ochch-appeal-argumentation"
          name="argumentation"
          required
          rows={5}
          value={argumentation}
          onChange={(e) => setArgumentation(e.target.value)}
          className="mt-1.5 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
      >
        {submitting ? "Отправка…" : "Отправить"}
      </button>
      {savedQuestion != null ? (
        <p className="text-sm text-success" role="status">
          Апелляция на вопрос {savedQuestion} сохранена.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
