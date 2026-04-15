import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { logProspectActivity } from "@/lib/activity";
import { hasMinRole } from "@/types/auth";
import type { UserRole } from "@/types/auth";

/**
 * PATCH /api/prospects/[prospectId]/notes
 *
 * Updates the internal notes field on a prospect.
 * Requires authentication and tenant ownership of the prospect.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ prospectId: string }> }
) {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found" },
        { status: 401 }
      );
    }

    // Server-side role guard — phase 42. Per 42-01-PLAN.md Pattern B.
    const role = (user.app_metadata?.role as UserRole) || "assistant";
    if (!hasMinRole(role, "agent")) {
      return NextResponse.json(
        { error: "Forbidden", message: "Your role does not permit this action" },
        { status: 403 }
      );
    }

    // 2. Parse body
    const { prospectId } = await context.params;
    const body = await request.json();
    const notes = typeof body.notes === "string" ? body.notes : null;

    // 3. Update the prospect's notes (RLS ensures tenant access)
    const { data, error: updateError } = await supabase
      .from("prospects")
      .update({ notes, updated_at: new Date().toISOString() })
      .eq("id", prospectId)
      .eq("tenant_id", tenantId)
      .select("id, notes")
      .single();

    if (updateError) {
      console.error("Failed to update notes:", updateError);
      return NextResponse.json(
        { error: "Failed to save notes" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Prospect not found" },
        { status: 404 }
      );
    }

    // 4. Log activity (fire-and-forget)
    logActivity({
      tenantId,
      userId: user.id,
      actionType: "note_added",
      targetType: "prospect",
      targetId: prospectId,
    }).catch(() => {});

    logProspectActivity({
      prospectId, tenantId, userId: user.id,
      category: 'team', eventType: 'note_added',
      title: 'Note updated',
    }).catch(() => {});

    return NextResponse.json({ notes: data.notes });
  } catch (error) {
    console.error("Notes update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
