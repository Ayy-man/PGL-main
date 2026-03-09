import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { inngest } from "@/inngest/client";

/**
 * POST /api/prospects/[prospectId]/enrich
 *
 * Triggers enrichment for a prospect if data is missing or stale (>7 days).
 * Sends Inngest event to orchestrate ContactOut, Exa, SEC EDGAR, and Claude enrichment.
 *
 * Returns:
 * - 200: Already enriched or enrichment in progress (no action taken)
 * - 202: Enrichment started
 * - 401: Not authenticated
 * - 404: Prospect not found or doesn't belong to tenant
 * - 500: Server error
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ prospectId: string }> }
) {
  try {
    // Validate user session
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      return NextResponse.json(
        { error: "No tenant ID found in session" },
        { status: 401 }
      );
    }

    // Extract prospectId from route params
    const { prospectId } = await context.params;

    // Fetch prospect from database (verify it exists and belongs to tenant)
    const { data: prospect, error: fetchError } = await supabase
      .from("prospects")
      .select(
        `
        id,
        tenant_id,
        full_name,
        work_email,
        linkedin_url,
        title,
        company,
        publicly_traded_symbol,
        company_cik,
        enrichment_status,
        last_enriched_at
      `
      )
      .eq("id", prospectId)
      .single();

    if (fetchError || !prospect) {
      return NextResponse.json(
        { error: "Prospect not found" },
        { status: 404 }
      );
    }

    // RLS ensures prospect belongs to tenant, but double-check
    if (prospect.tenant_id !== tenantId) {
      return NextResponse.json(
        { error: "Prospect not found" },
        { status: 404 }
      );
    }

    // Check staleness: if last_enriched_at is within 7 days AND status is 'complete', skip
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const lastEnriched = prospect.last_enriched_at
      ? new Date(prospect.last_enriched_at).getTime()
      : 0;

    if (
      prospect.enrichment_status === "complete" &&
      lastEnriched > 0 &&
      now - lastEnriched < SEVEN_DAYS_MS
    ) {
      return NextResponse.json(
        {
          status: "already_enriched",
          message: "Already enriched, not stale",
          last_enriched_at: prospect.last_enriched_at,
        },
        { status: 200 }
      );
    }

    // Check if already in progress
    if (prospect.enrichment_status === "in_progress") {
      return NextResponse.json(
        {
          status: "in_progress",
          message: "Enrichment already in progress",
        },
        { status: 200 }
      );
    }

    // Send Inngest event to trigger enrichment workflow
    await inngest.send({
      name: "prospect/enrich.requested",
      data: {
        prospectId,
        tenantId,
        userId: user.id,
        email: prospect.work_email || undefined,
        linkedinUrl: prospect.linkedin_url || undefined,
        name: prospect.full_name,
        company: prospect.company || "",
        title: prospect.title || "",
        isPublicCompany: !!prospect.publicly_traded_symbol,
        companyCik: prospect.company_cik || undefined,
      },
    });

    return NextResponse.json(
      {
        status: "enrichment_started",
        message: "Enrichment workflow initiated",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("Enrichment trigger error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
