// Pure-helper coverage for HelpMenu.
// Per 41-CONTEXT test-strategy (LOCKED: pure helpers only, no RTL), we do NOT
// render the React component here. We instead verify the public contract that
// HelpMenu relies on: pickVideoRenderer picks the right renderer for a URL,
// and resolveVideoUrl routes to the "missing" fallback when the env var is
// unset (the behavior HelpMenu surfaces as "Video coming soon").
//
// These are the same helpers exercised in src/lib/onboarding/__tests__/video-url.test.ts,
// re-asserted from the consumer's import path to guard against a future
// refactor that accidentally removes / renames the export HelpMenu depends on.

import { describe, it, expect } from "vitest";
import {
  pickVideoRenderer,
  resolveVideoUrl,
} from "@/lib/onboarding/video-url";

describe("HelpMenu helpers — pickVideoRenderer", () => {
  it("returns 'video' for direct mp4", () => {
    expect(pickVideoRenderer("https://cdn.example.com/a.mp4")).toBe("video");
  });

  it("returns 'iframe' for loom", () => {
    expect(pickVideoRenderer("https://loom.com/share/abc")).toBe("iframe");
  });

  it("returns 'iframe' for junk url", () => {
    expect(pickVideoRenderer("not-a-url")).toBe("iframe");
  });
});

describe("HelpMenu helpers — resolveVideoUrl drives the dialog content", () => {
  it("missing env routes to the 'Video coming soon' fallback branch", () => {
    expect(resolveVideoUrl({}).kind).toBe("missing");
  });

  it("valid https url routes to the embed branch", () => {
    const r = resolveVideoUrl({
      NEXT_PUBLIC_PGL_INTRO_VIDEO_URL: "https://loom.com/share/abc",
    });
    expect(r.kind).toBe("url");
  });

  it("non-URL env routes to the invalid branch (fallback copy shown)", () => {
    expect(
      resolveVideoUrl({ NEXT_PUBLIC_PGL_INTRO_VIDEO_URL: "not-a-url" }).kind
    ).toBe("invalid");
  });
});
