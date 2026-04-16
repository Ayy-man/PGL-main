import { describe, it, expect } from "vitest";
import {
  nextTourStep,
  nextPresentTourStep,
  previousTourStep,
  findFirstPresentStep,
} from "../tour-navigation";
import { TOUR_STEPS } from "../tour-steps";

// Canonical step ids in the 15-step tour. Kept as a constant so step-order
// changes are a one-line update here.
const IDS = TOUR_STEPS.map((s) => s.id);
const FIRST = IDS[0];
const LAST = IDS[IDS.length - 1];

describe("nextTourStep", () => {
  it("advances structurally through the sequence", () => {
    for (let i = 0; i < IDS.length - 1; i++) {
      expect(nextTourStep(IDS[i])).toBe(IDS[i + 1]);
    }
  });
  it("returns null on terminal step", () => {
    expect(nextTourStep(LAST)).toBeNull();
  });
});

describe("previousTourStep", () => {
  it("walks back", () => {
    expect(previousTourStep(IDS[1])).toBe(IDS[0]);
    expect(previousTourStep(LAST)).toBe(IDS[IDS.length - 2]);
  });
  it("returns null at start", () => {
    expect(previousTourStep(FIRST)).toBeNull();
  });
});

describe("nextPresentTourStep", () => {
  it("returns the immediate next step when its target is present", () => {
    const present = new Set(TOUR_STEPS.map((s) => s.targetSelector));
    expect(nextPresentTourStep(FIRST, (s) => present.has(s))).toBe(IDS[1]);
  });
  it("skips absent targets and lands on the next present step", () => {
    // Only keep the first step and the LAST step present
    const present = new Set([
      TOUR_STEPS[0].targetSelector,
      TOUR_STEPS[TOUR_STEPS.length - 1].targetSelector,
    ]);
    expect(nextPresentTourStep(FIRST, (s) => present.has(s))).toBe(LAST);
  });
  it("returns null when no remaining step is present", () => {
    const present = new Set<string>([]);
    expect(nextPresentTourStep(FIRST, (s) => present.has(s))).toBeNull();
  });
  it("returns null at terminus regardless of presence map", () => {
    const present = new Set(TOUR_STEPS.map((s) => s.targetSelector));
    expect(nextPresentTourStep(LAST, (s) => present.has(s))).toBeNull();
  });
});

describe("findFirstPresentStep", () => {
  it("returns first step whose selector is present", () => {
    // Force the first-present to be the LAST step by only marking it present
    const present = new Set([TOUR_STEPS[TOUR_STEPS.length - 1].targetSelector]);
    expect(findFirstPresentStep(TOUR_STEPS, (s) => present.has(s))).toBe(LAST);
  });
  it("returns null when no targets present", () => {
    expect(findFirstPresentStep(TOUR_STEPS, () => false)).toBeNull();
  });
  it("picks first step when all targets present", () => {
    expect(findFirstPresentStep(TOUR_STEPS, () => true)).toBe(FIRST);
  });
});

describe("TOUR_STEPS shape invariants", () => {
  it("has 15 steps in canonical dashboard->search->results->dossier->export order", () => {
    expect(IDS).toEqual([
      "dashboard-welcome",
      "dashboard-checklist",
      "nav-discover",
      "search-hero",
      "search-filters",
      "search-new-cta",
      "search-try",
      "results-header",
      "results-bulk-actions",
      "dossier-enriching",
      "dossier-contacts",
      "dossier-ai-summary",
      "dossier-wealth",
      "dossier-research",
      "export-done",
    ]);
  });
  it("every step has a non-empty title, body, and targetSelector", () => {
    for (const s of TOUR_STEPS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
      expect(s.targetSelector).toMatch(/^\[data-tour-id=".+"\]$/);
    }
  });
  it("advanceOn is only set on the three event-triggered steps", () => {
    const withEvent = TOUR_STEPS.filter((s) => s.advanceOn);
    expect(withEvent.map((s) => s.id)).toEqual([
      "search-try",
      "results-bulk-actions",
      "dossier-enriching",
    ]);
  });
  it("hiddenForAssistant flag is set on the 8 write-gated steps (C1-E5)", () => {
    const hidden = TOUR_STEPS.filter((s) => s.hiddenForAssistant);
    expect(hidden.map((s) => s.id)).toEqual([
      "results-header",
      "results-bulk-actions",
      "dossier-enriching",
      "dossier-contacts",
      "dossier-ai-summary",
      "dossier-wealth",
      "dossier-research",
      "export-done",
    ]);
  });
});
