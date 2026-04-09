import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apolloBreaker } from "@/lib/circuit-breaker/apollo-breaker";
import { translateFiltersToApolloParams } from "@/lib/apollo/client";
import { apolloRateLimiter } from "@/lib/rate-limit/limiters";
import { withRateLimit, rateLimitResponse } from "@/lib/rate-limit/middleware";
import { logError } from "@/lib/error-logger";
import type {
  ApolloSearchParams,
  ApolloSearchResponse,
} from "@/lib/apollo/types";
import type { PersonaFilters } from "@/lib/personas/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/search/apollo/count
 *
 * Returns the estimated total Apollo match count for a given set of
 * persona filters. Used by the persona form dialog to show a live
 * "X leads match" preview as the user edits filters.
 *
 * Apollo search is free (no credits), but we still run it through the
 * circuit breaker + per-tenant rate limiter to protect against abuse.
 * Requests `per_page=1` to minimize payload size — only `total_entries`
 * is used from the response.
 */

const filtersSchema = z.object({
  organization_names: z.array(z.string()).optional(),
  titles: z.array(z.string()).optional(),
  seniorities: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  companySize: z.array(z.string()).optional(),
  keywords: z.string().optional(),
  net_worth_range: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 401 });
    }

    const rateLimit = await withRateLimit(
      apolloRateLimiter,
      `tenant:${tenantId}`
    );
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    const body = await request.json();
    const parsed = filtersSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid filters", details: parsed.error.issues },
        { status: 400 }
      );
    }

    // Require at least one filter — an empty body would match every
    // person in Apollo's database, which is meaningless and wasteful.
    const filters = parsed.data as PersonaFilters;
    const hasFilter =
      (filters.organization_names?.length ?? 0) > 0 ||
      (filters.titles?.length ?? 0) > 0 ||
      (filters.seniorities?.length ?? 0) > 0 ||
      (filters.industries?.length ?? 0) > 0 ||
      (filters.locations?.length ?? 0) > 0 ||
      (filters.companySize?.length ?? 0) > 0 ||
      (filters.keywords?.trim().length ?? 0) > 0 ||
      (filters.net_worth_range?.trim().length ?? 0) > 0;
    if (!hasFilter) {
      return NextResponse.json({ totalResults: 0 });
    }

    const translated = translateFiltersToApolloParams(filters);
    const params: ApolloSearchParams = {
      ...translated,
      page: 1,
      per_page: 1,
    };

    const result = (await apolloBreaker.fire(
      params
    )) as ApolloSearchResponse;
    const total =
      result.total_entries ?? result.pagination?.total_entries ?? 0;

    return NextResponse.json(
      { totalResults: total },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[api/search/apollo/count] Error:", message);
    logError({
      route: "/api/search/apollo/count",
      method: "POST",
      statusCode: 500,
      errorMessage: message,
    });
    return NextResponse.json({ error: "Count failed" }, { status: 500 });
  }
}
