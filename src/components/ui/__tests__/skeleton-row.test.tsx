import { describe, it, expect } from "vitest";
import {
  ROW_SKELETON_SHAPE,
  CARD_SKELETON_SHAPE,
  addEnrichingIds,
  removeEnrichingIds,
  reconcileEnrichedPayload,
} from "../lib/skeleton-shapes";

/**
 * Pure-helper tests for skeleton row/card state + shape classes.
 *
 * Per Phase 40 CONTEXT "Test strategy (LOCKED)":
 *   - `@testing-library/react` is NOT installed.
 *   - No `render()`, no `fireEvent`, no jsdom.
 *   - Extract state-transition and shape-class logic into pure helpers and
 *     test them directly with Vitest.
 *
 * Phase 14-polish shape convention (from project memory):
 *   - `rounded-lg` for row-shape skeletons
 *   - `rounded-[14px]` for card-shape skeletons
 */

describe("Skeleton shape conventions", () => {
  it("row shape uses rounded-lg (Phase 14-polish convention)", () => {
    expect(ROW_SKELETON_SHAPE).toBe("rounded-lg");
  });

  it("card shape uses rounded-[14px] (Phase 14-polish convention)", () => {
    expect(CARD_SKELETON_SHAPE).toBe("rounded-[14px]");
  });

  it("row and card shapes are distinct", () => {
    expect(ROW_SKELETON_SHAPE).not.toBe(CARD_SKELETON_SHAPE);
  });
});

function sortedSetValues(s: Set<string>): string[] {
  return Array.from(s).sort();
}

describe("addEnrichingIds (pure)", () => {
  it("adds ids to an empty Set", () => {
    const next = addEnrichingIds(new Set<string>(), ["a", "b"]);
    expect(sortedSetValues(next)).toEqual(["a", "b"]);
  });

  it("merges with existing ids without dedupe issues", () => {
    const prev = new Set<string>(["a"]);
    const next = addEnrichingIds(prev, ["b", "a", "c"]);
    expect(sortedSetValues(next)).toEqual(["a", "b", "c"]);
  });

  it("returns a new Set (immutability — no mutation of prev)", () => {
    const prev = new Set<string>(["a"]);
    const next = addEnrichingIds(prev, ["b"]);
    expect(next).not.toBe(prev);
    expect(sortedSetValues(prev)).toEqual(["a"]); // prev untouched
  });

  it("no-ops when given an empty id list (still returns a new Set)", () => {
    const prev = new Set<string>(["a"]);
    const next = addEnrichingIds(prev, []);
    expect(sortedSetValues(next)).toEqual(["a"]);
    expect(next).not.toBe(prev);
  });
});

describe("removeEnrichingIds (pure)", () => {
  it("removes ids from a Set", () => {
    const prev = new Set<string>(["a", "b", "c"]);
    const next = removeEnrichingIds(prev, ["b"]);
    expect(sortedSetValues(next)).toEqual(["a", "c"]);
  });

  it("ignores ids that are not present", () => {
    const prev = new Set<string>(["a"]);
    const next = removeEnrichingIds(prev, ["zzz"]);
    expect(sortedSetValues(next)).toEqual(["a"]);
  });

  it("returns a new Set (no mutation)", () => {
    const prev = new Set<string>(["a", "b"]);
    const next = removeEnrichingIds(prev, ["a"]);
    expect(next).not.toBe(prev);
    expect(sortedSetValues(prev)).toEqual(["a", "b"]); // prev untouched
  });

  it("clearing all ids yields an empty Set", () => {
    const prev = new Set<string>(["a", "b"]);
    const next = removeEnrichingIds(prev, ["a", "b"]);
    expect(next.size).toBe(0);
  });
});

describe("reconcileEnrichedPayload (realtime belt-and-suspenders)", () => {
  it("clears an id when realtime payload reports enrichment_status === 'enriched'", () => {
    const prev = new Set<string>(["a", "b"]);
    const next = reconcileEnrichedPayload(prev, {
      id: "a",
      enrichment_status: "enriched",
    });
    expect(sortedSetValues(next)).toEqual(["b"]);
  });

  it("also clears on terminal status 'complete' or 'failed' (existing re-enrich contract)", () => {
    expect(
      sortedSetValues(
        reconcileEnrichedPayload(new Set<string>(["a"]), {
          id: "a",
          enrichment_status: "complete",
        })
      )
    ).toEqual([]);
    expect(
      sortedSetValues(
        reconcileEnrichedPayload(new Set<string>(["a"]), {
          id: "a",
          enrichment_status: "failed",
        })
      )
    ).toEqual([]);
  });

  it("leaves the Set untouched for non-terminal statuses (pending, enriching)", () => {
    const prev = new Set<string>(["a"]);
    const pending = reconcileEnrichedPayload(prev, { id: "a", enrichment_status: "pending" });
    expect(sortedSetValues(pending)).toEqual(["a"]);
  });

  it("leaves the Set untouched when the payload id is not tracked", () => {
    const prev = new Set<string>(["a"]);
    const next = reconcileEnrichedPayload(prev, {
      id: "zzz",
      enrichment_status: "enriched",
    });
    expect(sortedSetValues(next)).toEqual(["a"]);
    // Same reference is fine here — no work to do
  });

  it("no-ops when payload has no enrichment_status", () => {
    const prev = new Set<string>(["a"]);
    const next = reconcileEnrichedPayload(prev, { id: "a" });
    expect(sortedSetValues(next)).toEqual(["a"]);
  });
});
