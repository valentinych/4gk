import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatScore(score: number): string {
  return new Intl.NumberFormat("pl-PL").format(score);
}

export function pluralize(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one;
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return few;
  return many;
}
