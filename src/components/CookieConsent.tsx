"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const COOKIE_KEY = "4gk-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-white p-5 shadow-lg">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Używamy plików cookie</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Serwis 4gk.pl wykorzystuje pliki cookie niezbędne do prawidłowego funkcjonowania
              strony oraz uwierzytelniania użytkowników (Google OAuth). Nie stosujemy plików
              cookie marketingowych ani reklamowych. Korzystając z serwisu, wyrażasz zgodę
              na przetwarzanie danych zgodnie z naszą{" "}
              <Link href="/privacy" className="font-medium underline underline-offset-2 hover:text-foreground">
                Polityką prywatności
              </Link>.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={accept}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Akceptuję
              </button>
              <button
                onClick={decline}
                className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                Tylko niezbędne
              </button>
            </div>
          </div>
          <button
            onClick={decline}
            className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-surface hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
