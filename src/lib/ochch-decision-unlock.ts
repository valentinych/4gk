/** Only this account may clear a locked OCHCH спорный or апелляция. */
const OCHCH_DECISION_UNLOCK_EMAIL = "zabavski@gmail.com";

export function canUnlockOchchDecision(
  email: string | null | undefined,
): boolean {
  return email?.trim().toLowerCase() === OCHCH_DECISION_UNLOCK_EMAIL;
}
