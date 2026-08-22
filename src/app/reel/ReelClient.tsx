"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, Scissors } from "lucide-react";
import { formatSeconds, parseTimecode } from "@/lib/reel";

function filenameFromDisposition(header: string | null): string {
  if (!header) return "clip.mp3";
  const star = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1]);
    } catch {
      /* fall through */
    }
  }
  const plain = header.match(/filename="([^"]+)"/i);
  return plain?.[1] || "clip.mp3";
}

export function ReelClient() {
  const [url, setUrl] = useState("");
  const [startStr, setStartStr] = useState("0:00");
  const [endStr, setEndStr] = useState("0:30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneName, setDoneName] = useState<string | null>(null);

  const preview = useMemo(() => {
    const start = parseTimecode(startStr);
    const end = parseTimecode(endStr);
    if (start === null || end === null) return null;
    if (end <= start) return null;
    const dur = end - start;
    return `${formatSeconds(start)} → ${formatSeconds(end)} (${formatSeconds(dur)})`;
  }, [startStr, endStr]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDoneName(null);

    try {
      const res = await fetch("/api/reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, start: startStr, end: endStr }),
      });

      const type = res.headers.get("Content-Type") ?? "";
      if (!res.ok || !type.includes("audio/mpeg")) {
        let message = "Не удалось скачать фрагмент.";
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          /* ignore */
        }
        setError(message);
        return;
      }

      const blob = await res.blob();
      const filename = filenameFromDisposition(res.headers.get("Content-Disposition"));
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      setDoneName(filename);
    } catch {
      setError("Не удалось выполнить запрос. Проверьте соединение.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="page-reel" className="mx-auto max-w-lg px-4 py-12 sm:py-20">
      <div id="page-reel-header" className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-violet-100 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
          <Scissors className="h-3.5 w-3.5" />
          Инструмент
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Нарезка MP3
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Вставьте ссылку на YouTube и таймкоды начала и конца — скачается фрагмент в MP3.
          Формат: <code className="rounded bg-muted/20 px-1">1:23</code>,{" "}
          <code className="rounded bg-muted/20 px-1">1:23:45</code> или секунды.
        </p>
      </div>

      <form
        id="page-reel-form"
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-surface p-6 space-y-4"
      >
        <div>
          <label htmlFor="reel-url" className="block text-xs font-medium text-muted mb-1">
            Ссылка на YouTube
          </label>
          <input
            id="reel-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={loading}
            autoComplete="off"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="reel-start" className="block text-xs font-medium text-muted mb-1">
              Начало
            </label>
            <input
              id="reel-start"
              type="text"
              value={startStr}
              onChange={(e) => setStartStr(e.target.value)}
              placeholder="0:30"
              disabled={loading}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </div>
          <div>
            <label htmlFor="reel-end" className="block text-xs font-medium text-muted mb-1">
              Конец
            </label>
            <input
              id="reel-end"
              type="text"
              value={endStr}
              onChange={(e) => setEndStr(e.target.value)}
              placeholder="1:45"
              disabled={loading}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
            />
          </div>
        </div>

        {preview && (
          <p className="text-xs text-muted">Фрагмент: {preview}</p>
        )}

        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {loading ? "Скачиваю и обрезаю…" : "Скачать фрагмент"}
        </button>
      </form>

      {error && (
        <div
          id="page-reel-error"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {doneName && !loading && (
        <div
          id="page-reel-done"
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          Готово: <span className="font-medium">{doneName}</span>
        </div>
      )}
    </div>
  );
}
