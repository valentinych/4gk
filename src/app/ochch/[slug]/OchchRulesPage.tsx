import { OCHCH_CHANNEL_URL, OCHCH_CHGK_EDITORS, OCHCH_SI_EDITOR, OCHCH_VENUE_MAIN, ochchRatingPublicUrl } from "@/lib/ochch";

export function OchchRulesPage() {
  return (
    <div id="page-ochch-rules" className="space-y-5">
      <p className="text-sm text-muted">
        Полный текст положения ОЧЧ-2026 на портале не публиковался. Ниже — известные
        факты из анонсов; оперативные правила — в{" "}
        <a
          href={OCHCH_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          канале ОЧЧ
        </a>
        .
      </p>

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <h2 className="border-b border-border bg-sky-50 px-5 py-3 text-sm font-bold text-sky-900">
          Когда и где
        </h2>
        <div className="space-y-3 px-5 py-4 text-sm leading-relaxed">
          <p>
            Фестиваль проходит <strong>3–4 октября 2026</strong> в{" "}
            <strong>{OCHCH_VENUE_MAIN.name}</strong> ({OCHCH_VENUE_MAIN.address}).
            В пятницу 2 октября — отдельная программа в другом зале.
          </p>
          <p>
            ЧГК: 7 туров по 15 вопросов (4 тура в субботу, 3 в воскресенье).
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <h2 className="border-b border-border bg-sky-50 px-5 py-3 text-sm font-bold text-sky-900">
          Редакторы
        </h2>
        <div className="space-y-3 px-5 py-4 text-sm leading-relaxed">
          <p className="font-medium">ЧГК</p>
          <ul className="ml-1 space-y-1">
            {OCHCH_CHGK_EDITORS.map((name) => (
              <li key={name} className="text-sm">
                <span className="text-muted">●</span> {name}
              </li>
            ))}
          </ul>
          <p className="font-medium">Своя игра</p>
          <p>{OCHCH_SI_EDITOR}</p>
        </div>
      </section>

      <p className="text-sm text-muted">
        Страница турнира в рейтинге:{" "}
        <a
          href={ochchRatingPublicUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          rating.chgk.info/tournament/14219
        </a>
        .
      </p>
    </div>
  );
}
