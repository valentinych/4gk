"use client";

import Link from "next/link";
import { useState } from "react";
import { Trophy, Newspaper, Menu, X, User, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Logo } from "@/components/Logo";

const navItems = [
  { href: "/", label: "Главная", icon: Gamepad2 },
  { href: "/results", label: "Результаты", icon: Trophy },
  { href: "/leaderboard", label: "Рейтинг", icon: Trophy },
  { href: "/news", label: "Новости", icon: Newspaper },
  { href: "/lobby", label: "Играть", icon: Gamepad2, highlight: true },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-border backdrop-blur-xl" style={{ background: theme.vars["--header-bg"] }}>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo variant={theme.logoVariant} size="sm" />
          <span className="hidden text-lg font-semibold sm:block">4gk.pl</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                item.highlight
                  ? "bg-accent text-white hover:bg-accent/90"
                  : "text-foreground/70 hover:bg-surface-light hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <Link
            href="/auth/signin"
            className="hidden items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface-light sm:flex"
          >
            <User className="h-4 w-4" />
            Войти
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-foreground/70 hover:bg-surface-light md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                item.highlight
                  ? "bg-accent text-white"
                  : "text-foreground/70 hover:bg-surface-light hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
          <Link
            href="/auth/signin"
            className="mt-2 flex items-center gap-3 rounded-lg border border-border px-3 py-3 text-sm font-medium transition-colors hover:bg-surface-light"
          >
            <User className="h-5 w-5" />
            Войти
          </Link>
        </div>
      )}
    </header>
  );
}
