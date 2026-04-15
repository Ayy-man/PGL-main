import { describe, it, expect } from "vitest";
import {
  DEFAULT_ONBOARDING_STATE,
  type OnboardingState,
} from "@/types/onboarding";
import { mergeOnboardingState } from "@/lib/onboarding/merge-state";

describe("mergeOnboardingState", () => {
  it("applies partial over DEFAULT when current is undefined", () => {
    const next = mergeOnboardingState(undefined, { tour_completed: true });
    expect(next.tour_completed).toBe(true);
    expect(next.admin_checklist.invite_team).toBe(false);
    expect(next.admin_checklist.upload_logo).toBe(false);
    expect(next.admin_checklist.pick_theme).toBe(false);
    expect(next.admin_checklist.create_first_persona).toBe(false);
  });

  it("applies partial over DEFAULT when current is null", () => {
    const next = mergeOnboardingState(null, { tour_completed: true });
    expect(next.tour_completed).toBe(true);
    expect(next.admin_checklist.invite_team).toBe(false);
  });

  it("preserves admin_checklist keys when only tour_completed changes", () => {
    const current: OnboardingState = {
      tour_completed: false,
      admin_checklist: {
        invite_team: true,
        upload_logo: true,
        pick_theme: false,
        create_first_persona: false,
      },
    };
    const next = mergeOnboardingState(current, { tour_completed: true });
    expect(next.tour_completed).toBe(true);
    expect(next.admin_checklist).toEqual({
      invite_team: true,
      upload_logo: true,
      pick_theme: false,
      create_first_persona: false,
    });
  });

  it("deep-merges admin_checklist without clobbering other keys", () => {
    const current: OnboardingState = {
      tour_completed: true,
      admin_checklist: {
        invite_team: false,
        upload_logo: true,
        pick_theme: false,
        create_first_persona: false,
      },
    };
    const next = mergeOnboardingState(current, {
      admin_checklist: { invite_team: true },
    });
    expect(next.admin_checklist).toEqual({
      invite_team: true,
      upload_logo: true,
      pick_theme: false,
      create_first_persona: false,
    });
    expect(next.tour_completed).toBe(true);
  });

  it("does not mutate frozen inputs", () => {
    const current = Object.freeze({
      ...DEFAULT_ONBOARDING_STATE,
      admin_checklist: Object.freeze({
        ...DEFAULT_ONBOARDING_STATE.admin_checklist,
      }),
    }) as OnboardingState;
    expect(() =>
      mergeOnboardingState(current, { tour_completed: true })
    ).not.toThrow();
    // Also confirm partial itself is not mutated
    const partial = Object.freeze({ tour_completed: true });
    expect(() => mergeOnboardingState(current, partial)).not.toThrow();
  });

  it("filters unknown top-level keys out of the returned state", () => {
    const next = mergeOnboardingState(undefined, {
      tour_completed: true,
      // @ts-expect-error — intentional unknown key to assert defensive filter
      role: "super_admin",
      // @ts-expect-error — another intentional unknown key
      tenant_id: "t-pwn",
    });
    expect((next as Record<string, unknown>).role).toBeUndefined();
    expect((next as Record<string, unknown>).tenant_id).toBeUndefined();
    expect(next.tour_completed).toBe(true);
  });

  it("preserves tour_skipped_at / tour_completed_at when set", () => {
    const ts = "2026-04-15T10:00:00.000Z";
    const next = mergeOnboardingState(undefined, { tour_skipped_at: ts });
    expect(next.tour_skipped_at).toBe(ts);
  });

  it("returns the default admin_checklist shape when current is undefined and no admin_checklist in partial", () => {
    const next = mergeOnboardingState(undefined, {});
    expect(next).toEqual(DEFAULT_ONBOARDING_STATE);
    // And it must NOT return the same reference as the constant
    expect(next).not.toBe(DEFAULT_ONBOARDING_STATE);
    expect(next.admin_checklist).not.toBe(DEFAULT_ONBOARDING_STATE.admin_checklist);
  });

  it("empty partial over a populated current is a structural no-op", () => {
    const current: OnboardingState = {
      tour_completed: true,
      tour_completed_at: "2026-04-15T10:00:00.000Z",
      admin_checklist: {
        invite_team: true,
        upload_logo: true,
        pick_theme: true,
        create_first_persona: true,
      },
    };
    const next = mergeOnboardingState(current, {});
    expect(next).toEqual(current);
  });
});
