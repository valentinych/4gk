export type EventType = "multi-day" | "one-day" | "sync-chgk" | "si" | "brain-ring" | "other";

export interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  city: string;
  venue?: string | null;
  venueMapUrl?: string | null;
  description?: string | null;
  registrationLink?: string | null;
  ratingUrl?: string | null;
  mediaLink?: string | null;
  mediaLinkLabel?: string | null;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  participantLimit?: number | null;
  closeOnLimit?: boolean | null;
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
  { value: "multi-day", label: "Многодневный турнир" },
  { value: "one-day", label: "Однодневный турнир" },
  { value: "sync-chgk", label: "Синхрон ЧГК" },
  { value: "si", label: "Турнир ИСИ" },
  { value: "brain-ring", label: "Турнир Брейн-Ринга" },
  { value: "other", label: "Другой турнир" },
] as const;

export const CITY_OPTIONS = [
  "Варшава", "Краков", "Вроцлав", "Гданьск", "Сопот", "Познань", "Катовице",
] as const;
