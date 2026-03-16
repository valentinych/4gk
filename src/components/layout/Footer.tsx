import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Logo size={28} />
              <span className="text-base font-bold tracking-tight">4gk.pl</span>
            </div>
            <p className="mt-3 text-sm text-muted">
              Портал результатов интеллектуальных игр в Польше.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted/60">Турниры</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/warsaw" className="text-sm text-muted hover:text-foreground transition-colors">Чемпионат Варшавы</Link></li>
              <li><Link href="/ochp" className="text-sm text-muted hover:text-foreground transition-colors">ОЧП</Link></li>
              <li><Link href="/dziki-sopot" className="text-sm text-muted hover:text-foreground transition-colors">Dziki Sopot</Link></li>
              <li><Link href="/games" className="text-sm text-muted hover:text-foreground transition-colors">Другие игры</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted/60">Портал</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/news" className="text-sm text-muted hover:text-foreground transition-colors">Новости</Link></li>
              <li><Link href="/auth/signin" className="text-sm text-muted hover:text-foreground transition-colors">Войти</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted/60">Информация</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="#" className="text-sm text-muted hover:text-foreground transition-colors">О проекте</Link></li>
              <li><Link href="#" className="text-sm text-muted hover:text-foreground transition-colors">Контакты</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted/50">
          &copy; {new Date().getFullYear()} 4gk.pl
        </div>
      </div>
    </footer>
  );
}
