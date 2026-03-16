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
              Портал онлайн-игр с результатами, рейтингами и соревнованиями.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted/60">Портал</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/results" className="text-sm text-muted hover:text-foreground transition-colors">Результаты</Link></li>
              <li><Link href="/leaderboard" className="text-sm text-muted hover:text-foreground transition-colors">Рейтинг</Link></li>
              <li><Link href="/news" className="text-sm text-muted hover:text-foreground transition-colors">Новости</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted/60">Игры</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/lobby" className="text-sm text-muted hover:text-foreground transition-colors">Лобби</Link></li>
              <li><Link href="/quiz" className="text-sm text-muted hover:text-foreground transition-colors">Квиз</Link></li>
              <li><Link href="/reaction" className="text-sm text-muted hover:text-foreground transition-colors">Реакция</Link></li>
              <li><Link href="/memory" className="text-sm text-muted hover:text-foreground transition-colors">Память</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted/60">Информация</h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="#" className="text-sm text-muted hover:text-foreground transition-colors">О проекте</Link></li>
              <li><Link href="#" className="text-sm text-muted hover:text-foreground transition-colors">Контакты</Link></li>
              <li><Link href="#" className="text-sm text-muted hover:text-foreground transition-colors">Правила</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted/50">
          &copy; {new Date().getFullYear()} 4gk.pl — Все права защищены
        </div>
      </div>
    </footer>
  );
}
