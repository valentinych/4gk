/** Green circle for a team in the amateur band. The accessible name stays «любители». */
export function OchbAmateurBadge() {
  return (
    <span
      className="inline-flex shrink-0 items-center self-center leading-none"
      role="img"
      title="любители"
      aria-label="любители"
    >
      <span aria-hidden="true">🟢</span>
    </span>
  );
}
