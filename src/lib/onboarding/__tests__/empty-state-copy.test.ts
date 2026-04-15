import { describe, it, expect } from "vitest";
import { EMPTY_STATE_COPY, emptyStateCopy } from "../empty-state-copy";

describe("EMPTY_STATE_COPY", () => {
  it("has exactly 4 known surfaces", () => {
    expect(Object.keys(EMPTY_STATE_COPY).sort()).toEqual([
      "activity",
      "dashboard",
      "lists",
      "personas",
    ]);
  });

  it("personas copy defines 'saved search' in agent-friendly terms", () => {
    const text = [
      EMPTY_STATE_COPY.personas.title,
      EMPTY_STATE_COPY.personas.body,
      EMPTY_STATE_COPY.personas.ctaLabel,
    ]
      .join(" ")
      .toLowerCase();
    expect(text).toContain("saved search");
  });

  it("ctaHref substitutes orgId", () => {
    expect(EMPTY_STATE_COPY.dashboard.ctaHref("abc")).toBe("/abc/personas");
    expect(EMPTY_STATE_COPY.activity.ctaHref("xyz")).toBe("/xyz/search");
    expect(EMPTY_STATE_COPY.lists.ctaHref("acme")).toBe("/acme/lists");
    expect(EMPTY_STATE_COPY.personas.ctaHref("acme")).toBe("/acme/personas");
  });

  it("every entry has title, body, ctaLabel, and ctaHref", () => {
    for (const [surface, entry] of Object.entries(EMPTY_STATE_COPY)) {
      expect(entry.title, `${surface}.title`).toBeTruthy();
      expect(entry.body, `${surface}.body`).toBeTruthy();
      expect(entry.ctaLabel, `${surface}.ctaLabel`).toBeTruthy();
      expect(typeof entry.ctaHref, `${surface}.ctaHref type`).toBe("function");
    }
  });
});

describe("emptyStateCopy", () => {
  it("returns entry for known surface", () => {
    expect(emptyStateCopy("dashboard").title).toMatch(/prospects/i);
  });

  it("returns fallback for unknown surface (no null, no throw)", () => {
    const fb = emptyStateCopy("not-a-real-surface");
    expect(fb.title).toBeTruthy();
    expect(typeof fb.ctaHref).toBe("function");
    expect(fb.ctaLabel).toBeTruthy();
  });

  it("fallback ctaHref still substitutes orgId", () => {
    const fb = emptyStateCopy("unknown-surface");
    const href = fb.ctaHref("tenant-123");
    expect(href).toContain("tenant-123");
  });
});
