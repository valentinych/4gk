"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { UserMenu, UserMenuMobile } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { href: "/ochp", label: "ОЧП" },
  { href: "/dziki-sopot", label: "Dziki Sopot" },
  { href: "/warsaw", label: "Чемпионат Варшавы" },
  { href: "/calendar", label: "Календарь" },
  { href: "/online-games", label: "Онлайн-игры" },
];

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header id="cmp-header" className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-lg">
      <div id="cmp-header-inner" className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link id="cmp-header-logo" href="/" className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="text-base font-bold tracking-tight">4gk.pl</span>
        </Link>

        <nav id="cmp-header-nav-desktop" className="hidden items-center gap-0.5 md:flex">
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

        <div id="cmp-header-actions" className="flex items-center gap-1">
          <ThemeToggle />
          <div id="cmp-header-user-desktop" className="hidden sm:block">
            <UserMenu />
          </div>
          <button
            id="cmp-header-burger"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-muted hover:bg-surface md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div id="cmp-header-nav-mobile" className="border-t border-border bg-background px-4 pb-4 md:hidden">
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
          <UserMenuMobile />
        </div>
      )}
    </header>
  );
}
