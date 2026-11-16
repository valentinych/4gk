export const OCHP_2027_STATUSES = [
  "польская квота",
  "общий рейтинг",
  "первые заявившиеся",
  "вайлд-кард",
  "лист ожидания",
] as const;

export type Ochp2027Status = (typeof OCHP_2027_STATUSES)[number];

export function isOchp2027Status(value: unknown): value is Ochp2027Status {
  return typeof value === "string" && (OCHP_2027_STATUSES as readonly string[]).includes(value);
}
