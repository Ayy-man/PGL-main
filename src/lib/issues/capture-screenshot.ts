// Phase 33: Client-side page screenshot helper.
// Uses html2canvas-pro with oklch→rgb pre-resolution.
//
// html2canvas-pro can't render oklch() colors correctly, producing washed-out
// screenshots. Fix: in the onclone callback, we resolve all oklch() CSS custom
// properties to rgb() using the browser's own color engine (temp element +
// getComputedStyle), then inject the resolved values into the cloned document.
// html2canvas renders the clone with correct colors.

/**
 * Walk all stylesheets, find CSS custom properties with oklch() values,
 * and resolve them to rgb() using the browser's color engine.
 * Returns a CSS string to inject into the cloned document, or null if none found.
 */
function resolveOklchVariables(): string | null {
  try {
    const overrides: string[] = [];

    // Temp element — the browser resolves oklch→rgb when we set style.color
    const temp = document.createElement("div");
    temp.style.display = "none";
    document.body.appendChild(temp);

    try {
      for (let s = 0; s < document.styleSheets.length; s++) {
        const sheet = document.styleSheets[s];
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue; // cross-origin stylesheet, skip
        }

        for (let r = 0; r < rules.length; r++) {
          const rule = rules[r];
          if (!(rule instanceof CSSStyleRule)) continue;

          // Process any rule that defines custom properties (could be :root, .dark, etc.)
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            if (!prop.startsWith("--")) continue;

            const value = rule.style.getPropertyValue(prop).trim();
            if (!value.includes("oklch")) continue;

            // Resolve oklch to rgb via the browser's color engine
            temp.style.color = value;
            const resolved = getComputedStyle(temp).color;
            if (resolved && resolved !== value) {
              overrides.push(`${prop}: ${resolved} !important`);
            }
          }
        }
      }
    } finally {
      document.body.removeChild(temp);
    }

    if (overrides.length === 0) return null;
    return `:root { ${overrides.join("; ")}; }`;
  } catch {
    return null;
  }
}

export async function captureScreenshot(): Promise<Blob | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  try {
    // Pre-resolve oklch variables BEFORE html2canvas import (runs in parallel with dynamic import)
    const resolvedCss = resolveOklchVariables();

    const { default: html2canvas } = await import("html2canvas-pro");
    const canvas = await Promise.race([
      html2canvas(document.body, {
        useCORS: true,
        allowTaint: false,
        logging: false,
        scale: 1, // 1x — Retina (2x) produces 5-10MB PNGs that exceed Vercel's 4.5MB body limit
        onclone: (clonedDoc: Document) => {
          // Inject resolved oklch→rgb overrides so html2canvas renders correct colors
          if (resolvedCss) {
            const style = clonedDoc.createElement("style");
            style.textContent = resolvedCss;
            clonedDoc.head.appendChild(style);
          }
        },
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
    if (!canvas) return null;
    return await new Promise<Blob | null>((resolve) =>
      (canvas as HTMLCanvasElement).toBlob(resolve, "image/jpeg", 0.7)
    );
  } catch {
    return null;
  }
}
