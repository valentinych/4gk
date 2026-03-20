export type EventType = "tournament" | "sync" | "league" | "other";

export interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate?: string | null;
  city: string;
  venue?: string | null;
  venueMapUrl?: string | null;
  description?: string | null;
  registrationLink?: string | null;
  mediaLink?: string | null;
  mediaLinkLabel?: string | null;
}

export const cityColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Варшава:  { bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500" },
  Краков:   { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  dot: "bg-violet-500" },
  Вроцлав:  { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  Гданьск:  { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500" },
  Сопот:    { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    dot: "bg-rose-500" },
  Познань:  { bg: "bg-cyan-50",    text: "text-cyan-700",    border: "border-cyan-200",    dot: "bg-cyan-500" },
  Катовице: { bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  dot: "bg-orange-500" },
};

export const defaultCityColor = {
  bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", dot: "bg-gray-400",
};

export function getCityColor(city: string) {
  return cityColors[city] ?? defaultCityColor;
}

export const EVENT_TYPES = [
  { value: "tournament", label: "Турнир" },
  { value: "sync", label: "Синхрон" },
  { value: "league", label: "Лига" },
  { value: "other", label: "Другое" },
] as const;

export const CITY_OPTIONS = [
  "Варшава", "Краков", "Вроцлав", "Гданьск", "Сопот", "Познань", "Катовице",
] as const;
