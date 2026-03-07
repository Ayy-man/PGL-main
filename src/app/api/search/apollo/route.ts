import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchRequestSchema } from "@/lib/apollo/schemas";
import {
  searchApollo,
  RateLimitError,
  ApolloApiError,
} from "@/lib/apollo/client";
import { getPersonaById, updatePersonaLastUsed } from "@/lib/personas/queries";

export const dynamic = "force-dynamic";

/**
 * POST /api/search/apollo
 *
 * Search Apollo.io for people matching a persona.
 *
 * Request body:
 * - personaId: UUID of persona to search
 * - page: Page number (1-indexed, default 1)
 * - pageSize: Results per page (10-100, default 50)
 *
 * Returns:
 * - 200: { people, pagination, cached }
 * - 400: Invalid request (Zod validation error)
 * - 401: Unauthorized (no session)
 * - 403: No tenant associated
 * - 404: Persona not found
 * - 429: Rate limit exceeded
 * - 503: Apollo API unavailable (circuit breaker open)
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await request.json();
    console.info("[API /search/apollo] Request body:", JSON.stringify(body));
    const validationResult = searchRequestSchema.safeParse(body);

    if (!validationResult.success) {
      console.error("[API /search/apollo] Validation failed:", validationResult.error.format());
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { personaId, page, pageSize, filterOverrides } = validationResult.data;

    // 2. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("[API /search/apollo] No authenticated user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract tenant ID from app_metadata
    const tenantId = user.app_metadata?.tenant_id;
    console.info(`[API /search/apollo] User: ${user.email}, tenant: ${tenantId}`);
    if (!tenantId) {
      console.error("[API /search/apollo] No tenant_id in app_metadata:", JSON.stringify(user.app_metadata));
      return NextResponse.json(
        { error: "No tenant associated" },
        { status: 403 }
      );
    }

    let mergedFilters: Record<string, unknown>;
    let searchIdentifier: string;

    if (personaId) {
      // 3a. Persona-based search — fetch persona from database
      const persona = await getPersonaById(personaId, tenantId);
      if (!persona) {
        console.error(`[API /search/apollo] Persona not found: id=${personaId}, tenant=${tenantId}`);
        return NextResponse.json({ error: "Persona not found" }, { status: 404 });
      }
      console.info(`[API /search/apollo] Persona: ${persona.name}, filters:`, JSON.stringify(persona.filters));

      // Update persona last used timestamp (fire-and-forget)
      updatePersonaLastUsed(personaId, tenantId).catch((error) => {
        console.error("Failed to update persona last used:", error);
      });

      mergedFilters = filterOverrides
        ? { ...persona.filters, ...filterOverrides }
        : persona.filters;
      searchIdentifier = personaId;
    } else if (filterOverrides && Object.keys(filterOverrides).length > 0) {
      // 3b. Keyword-only search — no persona, use filterOverrides directly
      console.info(`[API /search/apollo] Keyword search, filters:`, JSON.stringify(filterOverrides));
      mergedFilters = filterOverrides;
      searchIdentifier = "keyword-search";
    } else {
      return NextResponse.json(
        { error: "Either personaId or filterOverrides with keywords required" },
        { status: 400 }
      );
    }

    // 4. Call searchApollo with merged filters
    const result = await searchApollo(
      tenantId,
      searchIdentifier,
      mergedFilters,
      page,
      pageSize
    );

    console.info(`[API /search/apollo] Returning ${result.people.length} results (cached: ${result.cached})`);

    // Return results with cache-control header
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    // 7. Error handling
    if (error instanceof RateLimitError) {
      console.warn("[API /search/apollo] Rate limit exceeded, reset at:", error.resetAt);
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          resetAt: error.resetAt,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Reset": error.resetAt.toString(),
            "Retry-After": Math.ceil(
              (error.resetAt - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }

    if (error instanceof ApolloApiError) {
      console.error("[API /search/apollo] ApolloApiError:", error.message, "status:", error.statusCode);
      const status = error.statusCode === 429 ? 429 : 503;
      return NextResponse.json(
        { error: error.message },
        { status }
      );
    }

    // Log unknown errors
    console.error("[API /search/apollo] Unexpected error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
