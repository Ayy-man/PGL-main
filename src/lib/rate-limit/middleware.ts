import { Ratelimit } from "@upstash/ratelimit";

/**
 * Execute rate limiting check for a given identifier.
 *
 * @param limiter - Ratelimit instance
 * @param identifier - Unique identifier (usually tenant:${tenantId})
 * @returns Rate limit result with success status and metadata
 */
export async function withRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const result = await limiter.limit(identifier);
  return result;
}

/**
 * Creates HTTP headers for rate limit information.
 *
 * @param result - Rate limit result
 * @returns Headers object with X-RateLimit-* headers
 */
export function rateLimitHeaders(result: {
  limit: number;
  remaining: number;
  reset: number;
}): Headers {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(result.limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set("X-RateLimit-Reset", String(result.reset));
  return headers;
}

/**
 * Creates a 429 Rate Limit Exceeded response with appropriate headers.
 *
 * @param result - Rate limit result
 * @returns 429 Response with rate limit headers and error body
 */
export function rateLimitResponse(result: {
  limit: number;
  remaining: number;
  reset: number;
}): Response {
  const headers = rateLimitHeaders(result);
  headers.set("Content-Type", "application/json");

  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      resetAt: result.reset,
    }),
    {
      status: 429,
      headers,
    }
  );
}
