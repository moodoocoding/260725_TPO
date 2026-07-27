export function isElapsedSecondsWithinLimit(
  value: unknown,
  timeLimitSeconds: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= Math.max(1, timeLimitSeconds)
  );
}
