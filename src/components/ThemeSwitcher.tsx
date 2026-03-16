"use client";

import { useTheme } from "@/components/ThemeProvider";
import { Palette, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

export function ThemeSwitcher() {
  const { theme, setThemeId, allThemes } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium transition-all hover:border-accent/40 hover:bg-surface-light"
        aria-label="Сменить тему"
      >
        <Palette className="h-4 w-4 text-accent-light" />
        <span className="hidden sm:inline">{theme.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">Выбери дизайн</p>
            <p className="text-xs text-foreground/40">4 уникальных темы оформления</p>
          </div>
          <div className="p-2">
            {allThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setThemeId(t.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-all",
                  theme.id === t.id
                    ? "bg-accent/10 ring-1 ring-accent/30"
                    : "hover:bg-surface-light"
                )}
              >
                <Logo variant={t.logoVariant} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{t.name}</span>
                    {theme.id === t.id && (
                      <Check className="h-3.5 w-3.5 text-accent-light" />
                    )}
                  </div>
                  <span className="text-xs text-foreground/40">{t.description}</span>
                </div>
                <div className="flex gap-1">
                  {[t.preview.bg, t.preview.accent, t.preview.text].map((color, i) => (
                    <div
                      key={i}
                      className="h-4 w-4 rounded-full border border-white/10"
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
