import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bulkEnrichPeople } from "@/lib/circuit-breaker/apollo-breaker";
import { logError } from "@/lib/error-logger";
import { z } from "zod";

const requestSchema = z.object({
  apolloIds: z.array(z.string()).min(1).max(25),
});

/**
 * POST /api/apollo/bulk-enrich
 *
 * Enriches Apollo preview results into full contact data (costs credits).
 * Called explicitly by "Enrich Selection" — never on search.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { apolloIds } = parseResult.data;
    const enriched = await bulkEnrichPeople(apolloIds);

    return NextResponse.json({
      people: enriched,
      count: enriched.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[apollo/bulk-enrich] Error:", message);

    // Surface credit errors clearly
    if (message.includes("insufficient credits")) {
      return NextResponse.json(
        { error: "Apollo credits exhausted. Credits renew at your next billing cycle." },
        { status: 402 }
      );
    }

    logError({
      route: "/api/apollo/bulk-enrich",
      method: "POST",
      statusCode: 500,
      errorMessage: message,
    });
    return NextResponse.json({ error: "Enrichment failed" }, { status: 500 });
  }
}
