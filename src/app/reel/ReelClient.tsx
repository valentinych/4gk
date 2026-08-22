"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Loader2, Scissors } from "lucide-react";
import { formatSeconds, MAX_COOKIES_BYTES, parseTimecode } from "@/lib/reel";

const COOKIES_KEY = "4gk-reel-cookies";

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

function persistCookies(value: string) {
  try {
    if (value) localStorage.setItem(COOKIES_KEY, value);
    else localStorage.removeItem(COOKIES_KEY);
  } catch {
    /* quota / private mode */
  }
}

export function ReelClient() {
  const [url, setUrl] = useState("");
  const [startStr, setStartStr] = useState("0:00");
  const [endStr, setEndStr] = useState("0:30");
  const [cookies, setCookies] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneName, setDoneName] = useState<string | null>(null);

  useEffect(() => {
    try {
      setCookies(localStorage.getItem(COOKIES_KEY) ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  const preview = useMemo(() => {
    const start = parseTimecode(startStr);
    const end = parseTimecode(endStr);
    if (start === null || end === null) return null;
    if (end <= start) return null;
    const dur = end - start;
    return `${formatSeconds(start)} → ${formatSeconds(end)} (${formatSeconds(dur)})`;
  }, [startStr, endStr]);

  function setAndStoreCookies(next: string) {
    setCookies(next);
    persistCookies(next);
  }

  async function handleCookiesFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_COOKIES_BYTES) {
      setError("Файл cookies слишком большой (максимум 512 КБ).");
      return;
    }
    const text = await file.text();
    setAndStoreCookies(text);
    setError(null);
  }

  function clearCookies() {
    setAndStoreCookies("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDoneName(null);

    try {
      const payload: { url: string; start: string; end: string; cookies?: string } = {
        url,
        start: startStr,
        end: endStr,
      };
      const cookiesTrim = cookies.trim();
      if (cookiesTrim) payload.cookies = cookiesTrim;

      const res = await fetch("/api/reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const type = res.headers.get("Content-Type") ?? "";
      if (!res.ok || !type.includes("audio/mpeg")) {
        let message = "Не удалось скачать фрагмент.";
        let detail: string | undefined;
        try {
          const data = (await res.json()) as { error?: string; detail?: string };
          if (data.error) message = data.error;
          if (data.detail) detail = data.detail;
        } catch {
          /* ignore */
        }
        setError(detail && detail !== message ? `${message}\n${detail}` : message);
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

  const hasCookies = Boolean(cookies.trim());

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

        <div id="page-reel-cookies" className="rounded-lg border border-border bg-background/60 p-3 space-y-2">
          <p className="text-xs leading-relaxed text-muted">
            YouTube блокирует датацентр; один раз экспортируйте cookies из браузера, где вы
            залогинены на YouTube, и вставьте сюда.
          </p>
          <p className="text-xs leading-relaxed text-muted">
            <a
              href="https://www.youtube.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
            >
              Открыть YouTube
              <ExternalLink className="h-3 w-3" />
            </a>
            {" "}в новой вкладке, войдите, затем экспорт через расширение Chrome
            «Get cookies.txt LOCALLY».
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="reel-cookies-file"
              className="inline-flex cursor-pointer items-center rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-muted/10"
            >
              Загрузить cookies.txt
            </label>
            <input
              id="reel-cookies-file"
              type="file"
              accept=".txt,text/plain"
              disabled={loading}
              onChange={handleCookiesFile}
              className="sr-only"
            />
            {hasCookies && (
              <>
                <span className="text-xs text-emerald-700">Cookies сохранены в этом браузере</span>
                <button
                  type="button"
                  onClick={clearCookies}
                  disabled={loading}
                  className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                >
                  Удалить cookies
                </button>
              </>
            )}
          </div>
          <label htmlFor="reel-cookies" className="block text-xs font-medium text-muted">
            Или вставьте cookies.txt
          </label>
          <textarea
            id="reel-cookies"
            value={cookies.length > 8000 ? "" : cookies}
            onChange={(e) => setAndStoreCookies(e.target.value)}
            placeholder={
              hasCookies && cookies.length > 8000
                ? "Cookies сохранены. Вставьте новый файл, чтобы заменить."
                : "# Netscape HTTP Cookie File"
            }
            disabled={loading}
            rows={4}
            spellCheck={false}
            autoComplete="off"
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
          />
        </div>

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
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 whitespace-pre-wrap"
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
