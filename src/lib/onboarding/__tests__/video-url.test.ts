import { describe, it, expect } from "vitest";
import {
  resolveVideoUrl,
  isEmbeddableVideoUrl,
  pickVideoRenderer,
} from "../video-url";

describe("resolveVideoUrl", () => {
  it("returns url when env set", () => {
    const r = resolveVideoUrl({
      NEXT_PUBLIC_PGL_INTRO_VIDEO_URL: "https://loom.com/share/abc",
    });
    expect(r).toEqual({ kind: "url", url: "https://loom.com/share/abc" });
  });

  it("returns missing when env unset", () => {
    expect(resolveVideoUrl({}).kind).toBe("missing");
  });

  it("treats empty string as missing", () => {
    expect(
      resolveVideoUrl({ NEXT_PUBLIC_PGL_INTRO_VIDEO_URL: "" }).kind
    ).toBe("missing");
  });

  it("treats whitespace-only string as missing", () => {
    expect(
      resolveVideoUrl({ NEXT_PUBLIC_PGL_INTRO_VIDEO_URL: "   " }).kind
    ).toBe("missing");
  });

  it("treats undefined env value as missing", () => {
    expect(
      resolveVideoUrl({ NEXT_PUBLIC_PGL_INTRO_VIDEO_URL: undefined }).kind
    ).toBe("missing");
  });

  it("returns invalid for non-URL strings", () => {
    expect(
      resolveVideoUrl({ NEXT_PUBLIC_PGL_INTRO_VIDEO_URL: "not-a-url" }).kind
    ).toBe("invalid");
  });

  it("returns invalid for non-http(s) protocols", () => {
    expect(
      resolveVideoUrl({
        NEXT_PUBLIC_PGL_INTRO_VIDEO_URL: "ftp://cdn.example.com/video.mp4",
      }).kind
    ).toBe("invalid");
  });
});

describe("isEmbeddableVideoUrl", () => {
  it("accepts loom share url", () => {
    expect(isEmbeddableVideoUrl("https://loom.com/share/abc")).toBe(true);
  });

  it("accepts loom subdomain", () => {
    expect(isEmbeddableVideoUrl("https://www.loom.com/share/abc")).toBe(true);
  });

  it("accepts youtube watch url", () => {
    expect(isEmbeddableVideoUrl("https://youtube.com/watch?v=abc")).toBe(true);
  });

  it("accepts youtu.be short url", () => {
    expect(isEmbeddableVideoUrl("https://youtu.be/abc")).toBe(true);
  });

  it("accepts vimeo url", () => {
    expect(isEmbeddableVideoUrl("https://vimeo.com/12345")).toBe(true);
  });

  it("accepts direct mp4", () => {
    expect(isEmbeddableVideoUrl("https://cdn.example.com/a.mp4")).toBe(true);
  });

  it("accepts direct webm", () => {
    expect(isEmbeddableVideoUrl("https://cdn.example.com/a.webm")).toBe(true);
  });

  it("accepts direct mov", () => {
    expect(isEmbeddableVideoUrl("https://cdn.example.com/a.mov")).toBe(true);
  });

  it("rejects non-http(s) protocols (ftp)", () => {
    expect(isEmbeddableVideoUrl("ftp://example.com/video")).toBe(false);
  });

  it("rejects unparseable strings", () => {
    expect(isEmbeddableVideoUrl("not a url")).toBe(false);
  });

  it("rejects unknown host without media extension", () => {
    expect(isEmbeddableVideoUrl("https://example.com/some-page")).toBe(false);
  });
});

describe("pickVideoRenderer", () => {
  it("returns 'video' for direct mp4", () => {
    expect(pickVideoRenderer("https://cdn.example.com/a.mp4")).toBe("video");
  });

  it("returns 'video' for direct webm", () => {
    expect(pickVideoRenderer("https://cdn.example.com/a.webm")).toBe("video");
  });

  it("returns 'video' for direct mov", () => {
    expect(pickVideoRenderer("https://cdn.example.com/a.mov")).toBe("video");
  });

  it("returns 'iframe' for loom", () => {
    expect(pickVideoRenderer("https://loom.com/share/abc")).toBe("iframe");
  });

  it("returns 'iframe' for youtube", () => {
    expect(pickVideoRenderer("https://youtube.com/watch?v=abc")).toBe("iframe");
  });

  it("returns 'iframe' for junk url", () => {
    expect(pickVideoRenderer("not-a-url")).toBe("iframe");
  });
});
