/**
 * Deterministic color from a persona/saved-search ID.
 * Identical algorithm to the one in persona-pills.tsx.
 */
export function getPersonaColor(id: string): string {
  const hue = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return `hsl(${hue}, 60%, 50%)`;
}
