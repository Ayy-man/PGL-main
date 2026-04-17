// src/types/visibility.ts
// Shared Visibility type used by lists + personas (Phase 44 D-07)
// Mirrors Postgres enum `visibility_mode` — keep in sync manually.

export type Visibility = 'personal' | 'team_shared';

export const VISIBILITY_VALUES: readonly Visibility[] = ['personal', 'team_shared'] as const;

export function isVisibility(v: unknown): v is Visibility {
  return v === 'personal' || v === 'team_shared';
}
