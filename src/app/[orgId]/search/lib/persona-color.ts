/**
 * Deterministic HSL color from a persona/search ID.
 * Extracted from persona-pills.tsx so the new sidebar rail and shortcut list
 * can share the same color hashing.
 */
export function getPersonaColor(id: string): string {
  const hue = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  return `hsl(${hue}, 60%, 50%)`;
}
