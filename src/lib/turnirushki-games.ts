export type TurnirushkaGameType = "haza-broadcast" | "external-link";

export interface TurnirushkaGame {
  slug: string;
  title: string;
  emoji: string;
  type: TurnirushkaGameType;
  /** haza.online broadcast id */
  broadcastId?: number;
  url?: string;
}

const GAMES: Record<string, TurnirushkaGame[]> = {
  "drovushki-exportnye-2024": [
    {
      slug: "prolog",
      title: "ЧГК. Дровушки. Пролог",
      emoji: "📺",
      type: "haza-broadcast",
      broadcastId: 524,
    },
    {
      slug: "chernukha-1",
      title: "Чернуха: Черный пенни у тебя в штанах",
      emoji: "🖤",
      type: "external-link",
      url: "https://www.haza.online/",
    },
    {
      slug: "chernukha-2",
      title: "Чернуха: Зависть к клитору",
      emoji: "🖤",
      type: "external-link",
      url: "https://www.haza.online/",
    },
    {
      slug: "chernukha-3",
      title: "Чернуха: Дрочу и коростель",
      emoji: "🖤",
      type: "external-link",
      url: "https://www.haza.online/",
    },
  ],
  "sugrobushki-2025": [
    {
      slug: "black-chgk",
      title: "Черное ЧГК",
      emoji: "🖤",
      type: "haza-broadcast",
      broadcastId: 547,
    },
    {
      slug: "elimination-1",
      title: "ЧГК на выбывание: Allerlei",
      emoji: "⚔️",
      type: "external-link",
      url: "https://www.haza.online/",
    },
    {
      slug: "elimination-2",
      title: "ЧГК на выбывание: Алексей Бороненко. Спасибо за игру!",
      emoji: "⚔️",
      type: "external-link",
      url: "https://www.haza.online/",
    },
    {
      slug: "elimination-3",
      title: "ЧГК на выбывание: Одинокие ковбои",
      emoji: "⚔️",
      type: "external-link",
      url: "https://www.haza.online/",
    },
  ],
  "vesnushki-2025": [
    {
      slug: "sync-bb",
      title: "Синхрон ББ",
      emoji: "📺",
      type: "haza-broadcast",
      broadcastId: 594,
    },
  ],
  "drovushki-exportnye-2025": [
    {
      slug: "chernukha",
      title: "Чернуха",
      emoji: "🖤",
      type: "haza-broadcast",
      broadcastId: 610,
    },
  ],
  "sugrobushki-2026": [
    {
      slug: "prolog",
      title: "Пролог",
      emoji: "📺",
      type: "haza-broadcast",
      broadcastId: 630,
    },
    {
      slug: "chernukha-1",
      title: "Чернуха: Елдаки картофеля",
      emoji: "🖤",
      type: "external-link",
      url: "https://www.haza.online/",
    },
    {
      slug: "chernukha-2",
      title: "Чернуха: Анальнопробковый ноктурлабиум",
      emoji: "🖤",
      type: "external-link",
      url: "https://www.haza.online/",
    },
    {
      slug: "chernukha-3",
      title: "Чернуха: Это не теннис — это анальный секс",
      emoji: "🖤",
      type: "external-link",
      url: "https://www.haza.online/",
    },
  ],
};

export function getTurnirushkaGames(tournamentSlug: string): TurnirushkaGame[] {
  return GAMES[tournamentSlug] ?? [];
}

export function findTurnirushkaGame(
  tournamentSlug: string,
  gameSlug: string,
): TurnirushkaGame | null {
  return getTurnirushkaGames(tournamentSlug).find((g) => g.slug === gameSlug) ?? null;
}

export function turnirushkiHazaBroadcastAllowlist(): number[] {
  const ids = new Set<number>();
  for (const games of Object.values(GAMES)) {
    for (const g of games) {
      if (g.type === "haza-broadcast" && g.broadcastId != null) {
        ids.add(g.broadcastId);
      }
    }
  }
  return [...ids];
}
