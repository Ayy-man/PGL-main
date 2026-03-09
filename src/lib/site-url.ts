/**
 * Returns the canonical site URL for use in redirects, invite emails, etc.
 *
 * Resolution order:
 * 1. NEXT_PUBLIC_SITE_URL — explicit override (set in Vercel env vars)
 * 2. VERCEL_PROJECT_PRODUCTION_URL — auto-provided by Vercel on production deploys
 * 3. VERCEL_URL — auto-provided by Vercel (may be a preview deploy URL)
 * 4. localhost:3000 — local development fallback
 */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
