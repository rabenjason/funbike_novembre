/**
 * Return a copy of an ordered ID list with `id` inserted at the requested
 * zero-based position. Existing IDs at and after that position move down one.
 */
export function placeIdAtPosition<T extends number | string>(
  orderedIds: readonly T[],
  id: T,
  requestedPosition: number,
): T[] {
  const next = orderedIds.filter((existingId) => existingId !== id);
  const position = Number.isFinite(requestedPosition)
    ? Math.trunc(requestedPosition)
    : next.length;
  const insertionIndex = Math.max(0, Math.min(position, next.length));
  next.splice(insertionIndex, 0, id);
  return next;
}
