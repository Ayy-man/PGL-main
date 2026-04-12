// Phase 33: Client-side page screenshot helper.
// Uses html2canvas-pro (NOT html2canvas) because the project's globals.css
// defines all color tokens using oklch() which html2canvas 1.4.1 cannot parse.
// See 33-RESEARCH.md "Critical Finding: html2canvas vs html2canvas-pro".
//
// The 2-second soft timeout is an intentional trade-off: on slow/complex pages
// the screenshot is dropped (screenshot_path = null) rather than blocking the user.

export async function captureScreenshot(): Promise<Blob | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  try {
    const { default: html2canvas } = await import("html2canvas-pro");
    const canvas = await Promise.race([
      html2canvas(document.body, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        scale: 1, // 1x — Retina (2x) produces 5-10MB PNGs that exceed Vercel's 4.5MB body limit
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)),
    ]);
    if (!canvas) return null;
    return await new Promise<Blob | null>((resolve) =>
      (canvas as HTMLCanvasElement).toBlob(resolve, "image/jpeg", 0.6)
    );
  } catch {
    return null;
  }
}
