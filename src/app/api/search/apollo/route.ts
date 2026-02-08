import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchRequestSchema } from "@/lib/apollo/schemas";
import {
  searchApollo,
  RateLimitError,
  ApolloApiError,
} from "@/lib/apollo/client";
import { getPersonaById, updatePersonaLastUsed } from "@/lib/personas/queries";

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
    const validationResult = searchRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: validationResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { personaId, page, pageSize } = validationResult.data;

    // 2. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract tenant ID from app_metadata
    const tenantId = user.app_metadata?.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { error: "No tenant associated" },
        { status: 403 }
      );
    }

    // 3. Fetch persona from database
    const persona = await getPersonaById(personaId, tenantId);
    if (!persona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // 4. Update persona last used timestamp (fire-and-forget)
    updatePersonaLastUsed(personaId, tenantId).catch((error) => {
      console.error("Failed to update persona last used:", error);
    });

    // 5. Call searchApollo
    const result = await searchApollo(
      tenantId,
      personaId,
      persona.filters,
      page,
      pageSize
    );

    // Return results with cache-control header
    return NextResponse.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    // 6. Error handling
    if (error instanceof RateLimitError) {
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
      return NextResponse.json(
        { error: "Search service temporarily unavailable" },
        { status: 503 }
      );
    }

    // Log unknown errors
    console.error("Unexpected error in Apollo search:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
