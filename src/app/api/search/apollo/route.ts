import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchRequestSchema } from "@/lib/apollo/schemas";
import {
  searchApollo,
  RateLimitError,
  ApolloApiError,
} from "@/lib/apollo/client";
import { getPersonaById, updatePersonaLastUsed } from "@/lib/personas/queries";
import { logError } from "@/lib/error-logger";
import { ApiError, handleApiError } from "@/lib/api-error";
import { logActivity } from "@/lib/activity-logger";
import type { PersonaFilters } from "@/lib/personas/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/search/apollo
 *
 * Search Apollo.io for people matching a persona or filters.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    // 1. Parse and validate request body
    const body = await request.json();
    console.info("[API /search/apollo] ── Request received ──", JSON.stringify(body));
    const validationResult = searchRequestSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.format();
      console.error("[API /search/apollo] Zod validation failed:", JSON.stringify(errors));
      throw new ApiError("Invalid request", "VALIDATION_ERROR", 400, errors);
    }

    const { personaId, page, pageSize, filterOverrides } = validationResult.data;
    console.info("[API /search/apollo] Validated:", { personaId: personaId ?? "(none)", page, pageSize, hasOverrides: !!filterOverrides });

    // 2. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("[API /search/apollo] No authenticated user");
      throw new ApiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const tenantId = user.app_metadata?.tenant_id;
    console.info(`[API /search/apollo] Auth OK — user: ${user.email}, tenant: ${tenantId}`);

    if (!tenantId) {
      console.error("[API /search/apollo] No tenant_id in app_metadata:", JSON.stringify(user.app_metadata));
      throw new ApiError("No tenant associated", "FORBIDDEN", 403);
    }

    let mergedFilters: PersonaFilters;
    let searchIdentifier: string;

    if (personaId) {
      // 3a. Persona-based search
      const persona = await getPersonaById(personaId, tenantId);
      if (!persona) {
        console.error(`[API /search/apollo] Persona not found: id=${personaId}, tenant=${tenantId}`);
        throw new ApiError("Persona not found", "NOT_FOUND", 404);
      }
      console.info(`[API /search/apollo] Persona loaded: "${persona.name}"`, JSON.stringify(persona.filters));

      // Fire-and-forget: update last used
      updatePersonaLastUsed(personaId, tenantId).catch((error) => {
        console.error("[API /search/apollo] Failed to update persona last_used_at:", error);
      });

      mergedFilters = filterOverrides
        ? { ...persona.filters, ...filterOverrides }
        : persona.filters;
      searchIdentifier = personaId;
    } else if (filterOverrides && Object.keys(filterOverrides).length > 0) {
      // 3b. Filter-only search (NL-parsed or manual)
      console.info(`[API /search/apollo] Filter-only search:`, JSON.stringify(filterOverrides));
      mergedFilters = filterOverrides;
      searchIdentifier = "filter-search";
    } else {
      console.warn("[API /search/apollo] No persona and no filters — rejecting");
      throw new ApiError(
        "Either personaId or filterOverrides with keywords required",
        "VALIDATION_ERROR",
        400
      );
    }

    console.info("[API /search/apollo] Final merged filters →", JSON.stringify(mergedFilters));

    // 4. Call searchApollo
    const searchStart = Date.now();
    const result = await searchApollo(
      tenantId,
      searchIdentifier,
      mergedFilters,
      page,
      pageSize
    );
    const searchMs = Date.now() - searchStart;
    const totalMs = Date.now() - start;

    console.info(`[API /search/apollo] ── Response (${totalMs}ms, Apollo: ${searchMs}ms) ──`, {
      results: result.people.length,
      totalResults: result.pagination.totalResults,
      cached: result.cached,
    });

    // Fire-and-forget: log search activity (never blocks the response)
    logActivity({
      tenantId,
      userId: user.id,
      actionType: "search_executed",
      targetType: "persona",
      targetId: personaId ?? undefined,
      metadata: {
        resultCount: result.people.length,
        totalResults: result.pagination.totalResults,
        cached: result.cached,
        searchIdentifier,
        page,
      },
    }).catch(() => {}); // defensive catch — logActivity already catches internally

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const totalMs = Date.now() - start;

    if (error instanceof RateLimitError) {
      console.warn(`[API /search/apollo] Rate limit exceeded (${totalMs}ms), reset at:`, error.resetAt);
      const rateLimitResponse = NextResponse.json(
        { error: "Rate limit exceeded", code: "RATE_LIMITED", resetAt: error.resetAt },
        { status: 429 }
      );
      rateLimitResponse.headers.set("X-RateLimit-Reset", error.resetAt.toString());
      rateLimitResponse.headers.set(
        "Retry-After",
        Math.ceil((error.resetAt - Date.now()) / 1000).toString()
      );
      return rateLimitResponse;
    }

    if (error instanceof ApolloApiError) {
      console.error(`[API /search/apollo] ApolloApiError (${totalMs}ms):`, error.message, "status:", error.statusCode);
      const status = error.statusCode === 429 ? 429 : 503;
      const code = error.statusCode === 429 ? "RATE_LIMITED" : "EXTERNAL_API_ERROR";
      return NextResponse.json({ error: error.message, code }, { status });
    }

    // ApiError instances are handled by handleApiError (includes validation, auth, etc.)
    if (error instanceof ApiError) {
      return handleApiError(error);
    }

    console.error(`[API /search/apollo] ── Unexpected error (${totalMs}ms) ──`, error);
    logError({
      route: "/api/search/apollo",
      method: "POST",
      statusCode: 500,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return handleApiError(error);
  }
}
