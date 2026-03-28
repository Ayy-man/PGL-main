import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

/**
 * PATCH /api/prospects/[prospectId]/activity/[eventId]
 * DELETE /api/prospects/[prospectId]/activity/[eventId]
 *
 * PATCH: Edit the note field on an existing activity event.
 * DELETE: Remove an activity event.
 *
 * Both use createClient() (RLS-scoped) and async params (Next.js 15).
 * RLS handles tenant isolation; route also filters by prospect_id.
 */

const updateSchema = z.object({
  note: z.string().max(5000).nullable(),
});

// ─── Shared auth helper ───────────────────────────────────────────────────────

async function authenticate() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { supabase, user: null, tenantId: null, authError: "Unauthorized" };
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    return {
      supabase,
      user,
      tenantId: null,
      authError: "Tenant ID not found",
    };
  }

  return { supabase, user, tenantId, authError: null };
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ prospectId: string; eventId: string }> }
) {
  try {
    const { supabase, user, tenantId, authError } = await authenticate();
    if (authError || !user || !tenantId) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { prospectId, eventId } = await context.params;

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = updateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { note } = parseResult.data;

    // Update note field — RLS ensures tenant isolation
    const { data, error: updateError } = await supabase
      .from("prospect_activity")
      .update({ note })
      .eq("id", eventId)
      .eq("prospect_id", prospectId)
      .select(
        "id, prospect_id, tenant_id, user_id, category, event_type, title, note, metadata, event_at, created_at, triggers_status_change"
      )
      .single();

    if (updateError) {
      console.error("[activity PATCH] Update failed:", updateError);
      return NextResponse.json(
        { error: "Failed to update activity event" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Activity event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ event: data });
  } catch (error) {
    console.error("[activity PATCH] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ prospectId: string; eventId: string }> }
) {
  try {
    const { supabase, user, tenantId, authError } = await authenticate();
    if (authError || !user || !tenantId) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { prospectId, eventId } = await context.params;

    // Delete the event — RLS ensures tenant isolation
    const { data, error: deleteError, count } = await supabase
      .from("prospect_activity")
      .delete({ count: "exact" })
      .eq("id", eventId)
      .eq("prospect_id", prospectId)
      .select("id");

    if (deleteError) {
      console.error("[activity DELETE] Delete failed:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete activity event" },
        { status: 500 }
      );
    }

    // If nothing was deleted, the event didn't exist (or belong to this prospect)
    if ((count ?? 0) === 0 && (!data || data.length === 0)) {
      return NextResponse.json(
        { error: "Activity event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[activity DELETE] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
