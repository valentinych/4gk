import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-mono text-sm font-bold text-white">
                4GK
              </div>
              <span className="text-lg font-semibold">4gk.pl</span>
            </div>
            <p className="mt-3 text-sm text-foreground/50">
              Портал онлайн-игр с результатами, рейтингами и соревнованиями.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/40">
              Портал
            </h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/results" className="text-sm text-foreground/60 hover:text-foreground">Результаты</Link></li>
              <li><Link href="/leaderboard" className="text-sm text-foreground/60 hover:text-foreground">Рейтинг</Link></li>
              <li><Link href="/news" className="text-sm text-foreground/60 hover:text-foreground">Новости</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/40">
              Игры
            </h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="/lobby" className="text-sm text-foreground/60 hover:text-foreground">Лобби</Link></li>
              <li><Link href="/lobby" className="text-sm text-foreground/60 hover:text-foreground">Квиз</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/40">
              Информация
            </h3>
            <ul className="mt-3 space-y-2">
              <li><Link href="#" className="text-sm text-foreground/60 hover:text-foreground">О проекте</Link></li>
              <li><Link href="#" className="text-sm text-foreground/60 hover:text-foreground">Контакты</Link></li>
              <li><Link href="#" className="text-sm text-foreground/60 hover:text-foreground">Правила</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-foreground/40">
          &copy; {new Date().getFullYear()} 4gk.pl — Все права защищены
        </div>
      </div>
    </footer>
  );
}
