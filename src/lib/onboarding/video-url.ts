// Pure helpers for resolving and classifying the intro-video URL.
// No DOM access, no direct process.env reads — callers pass env in so the
// helpers stay unit-testable under Node without NEXT_PUBLIC_ plumbing.

export type VideoUrlResolution =
  | { kind: "url"; url: string }
  | { kind: "missing" }
  | { kind: "invalid" };

/**
 * Classify a raw env value into a discriminated resolution result.
 * - unset / empty / whitespace-only → missing
 * - unparseable or non-http(s) → invalid
 * - otherwise → url
 */
export function resolveVideoUrl(
  env: Partial<Record<string, string | undefined>>
): VideoUrlResolution {
  const raw = env.NEXT_PUBLIC_PGL_INTRO_VIDEO_URL;
  if (typeof raw !== "string" || raw.trim() === "") {
    return { kind: "missing" };
  }
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      return { kind: "invalid" };
    }
    return { kind: "url", url: raw };
  } catch {
    return { kind: "invalid" };
  }
}

/**
 * True when a URL points at something we know how to embed inline
 * (loom / youtube / vimeo iframe, or a direct video file the <video> tag handles).
 */
export function isEmbeddableVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const host = u.hostname.toLowerCase();
    if (host === "loom.com" || host.endsWith(".loom.com")) return true;
    if (
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be" ||
      host.endsWith(".youtu.be")
    ) {
      return true;
    }
    if (host === "vimeo.com" || host.endsWith(".vimeo.com")) return true;
    if (/\.(mp4|webm|mov)$/i.test(u.pathname)) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Choose how to render the video:
 * - direct file extension (mp4/webm/mov) → native <video>
 * - anything else (loom/youtube/vimeo/unknown) → <iframe>
 *
 * Unparseable URLs default to "iframe" — the caller shows a fallback
 * message anyway when resolveVideoUrl() returns something other than "url".
 */
export function pickVideoRenderer(url: string): "iframe" | "video" {
  try {
    const u = new URL(url);
    if (/\.(mp4|webm|mov)$/i.test(u.pathname)) return "video";
    return "iframe";
  } catch {
    return "iframe";
  }
}
