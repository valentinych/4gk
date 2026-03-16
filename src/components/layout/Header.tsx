"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, User } from "lucide-react";
import { Logo } from "@/components/Logo";

const navItems = [
  { href: "/warsaw", label: "Чемпионат Варшавы" },
  { href: "/ochp", label: "ОЧП" },
  { href: "/dziki-sopot", label: "Dziki Sopot" },
  { href: "/games", label: "Другие игры" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/85 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="text-base font-bold tracking-tight">4gk.pl</span>
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/auth/signin"
            className="hidden rounded-lg border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface sm:block"
          >
            Войти
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-muted hover:bg-surface md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-white px-4 pb-4 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-3 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/auth/signin"
            onClick={() => setMobileOpen(false)}
            className="mt-2 flex items-center gap-2 rounded-lg border border-border px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            <User className="h-4 w-4" />
            Войти
          </Link>
        </div>
      )}
    </header>
  );
}
