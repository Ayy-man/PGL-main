/**
 * Field resolution for manual override pattern.
 * Display logic: manual_value ?? enriched_value ?? null
 */
export function resolveField<T>(
  manual: T | null | undefined,
  enriched: T | null | undefined
): T | null {
  return manual ?? enriched ?? null;
}

/**
 * Check if a field has been manually overridden.
 * Used to show "edited" indicator with original value tooltip.
 */
export function isOverridden(
  manual: string | null | undefined
): boolean {
  return manual !== null && manual !== undefined && manual !== '';
}
