"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function OchbControversialForm() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedQuestion, setSavedQuestion] = useState<number | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    setSavedQuestion(null);

    try {
      const res = await fetch("/api/ochb/controversial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionNumber: Number(question),
          answerText: answer,
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
      router.refresh();
    } catch {
      setError("Не удалось отправить");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      id="page-ochb-controversial-form"
      onSubmit={onSubmit}
      className="max-w-md space-y-4"
    >
      <div>
        <label htmlFor="ochb-controversial-question" className="block text-sm font-medium">
          номер вопроса
        </label>
        <input
          id="ochb-controversial-question"
          name="questionNumber"
          type="number"
          inputMode="numeric"
          required
          min={1}
          max={90}
          step={1}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
        />
      </div>
      <div>
        <label htmlFor="ochb-controversial-answer" className="block text-sm font-medium">
          текст ответа
        </label>
        <input
          id="ochb-controversial-answer"
          name="answerText"
          type="text"
          required
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
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
          Ответ на вопрос {savedQuestion} сохранён.
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
