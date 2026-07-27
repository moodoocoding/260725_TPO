export function getRemainingSeconds(
  deadlineAtMilliseconds: number,
  currentTimeMilliseconds: number,
): number {
  if (
    !Number.isFinite(deadlineAtMilliseconds) ||
    !Number.isFinite(currentTimeMilliseconds) ||
    deadlineAtMilliseconds <= 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil((deadlineAtMilliseconds - currentTimeMilliseconds) / 1000),
  );
}
