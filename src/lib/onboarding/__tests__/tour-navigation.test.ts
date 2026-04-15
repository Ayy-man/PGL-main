import { describe, it, expect } from "vitest";
import {
  nextTourStep,
  nextPresentTourStep,
  previousTourStep,
  findFirstPresentStep,
} from "../tour-navigation";
import { TOUR_STEPS } from "../tour-steps";

describe("nextTourStep", () => {
  it("advances through the sequence", () => {
    expect(nextTourStep("discover")).toBe("search");
    expect(nextTourStep("search")).toBe("enrich");
    expect(nextTourStep("enrich")).toBe("list");
    expect(nextTourStep("list")).toBe("profile");
    expect(nextTourStep("profile")).toBe("export");
  });
  it("returns null on terminal step", () => {
    expect(nextTourStep("export")).toBeNull();
  });
});

describe("previousTourStep", () => {
  it("walks back", () => {
    expect(previousTourStep("search")).toBe("discover");
    expect(previousTourStep("export")).toBe("profile");
  });
  it("returns null at start", () => {
    expect(previousTourStep("discover")).toBeNull();
  });
});

describe("nextPresentTourStep", () => {
  it("returns the immediate next step when its target is present", () => {
    const present = new Set(TOUR_STEPS.map((s) => s.targetSelector));
    expect(nextPresentTourStep("discover", (s) => present.has(s))).toBe("search");
  });
  it("skips absent targets and lands on the next present step", () => {
    // simulate: 'search' and 'enrich' targets missing, 'list' present
    const present = new Set([
      TOUR_STEPS.find((s) => s.id === "discover")!.targetSelector,
      TOUR_STEPS.find((s) => s.id === "list")!.targetSelector,
      TOUR_STEPS.find((s) => s.id === "profile")!.targetSelector,
      TOUR_STEPS.find((s) => s.id === "export")!.targetSelector,
    ]);
    expect(nextPresentTourStep("discover", (s) => present.has(s))).toBe("list");
  });
  it("returns null when no remaining step is present", () => {
    const present = new Set<string>([]);
    expect(nextPresentTourStep("discover", (s) => present.has(s))).toBeNull();
  });
  it("returns null at terminus regardless of presence map", () => {
    const present = new Set(TOUR_STEPS.map((s) => s.targetSelector));
    expect(nextPresentTourStep("export", (s) => present.has(s))).toBeNull();
  });
});

describe("findFirstPresentStep", () => {
  it("returns first step whose selector is present", () => {
    const present = new Set(['[data-tour-id="bulk-actions-bar"]']);
    expect(
      findFirstPresentStep(TOUR_STEPS, (s) => present.has(s))
    ).toBe("enrich");
  });
  it("returns null when no targets present", () => {
    expect(findFirstPresentStep(TOUR_STEPS, () => false)).toBeNull();
  });
  it("picks discover when all targets present", () => {
    expect(findFirstPresentStep(TOUR_STEPS, () => true)).toBe("discover");
  });
});

describe("TOUR_STEPS", () => {
  it("has 6 steps in canonical order", () => {
    expect(TOUR_STEPS.map((s) => s.id)).toEqual([
      "discover",
      "search",
      "enrich",
      "list",
      "profile",
      "export",
    ]);
  });
});
