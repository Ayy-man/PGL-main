import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { logProspectActivity } from "@/lib/activity";
import { z } from "zod";

/**
 * PATCH /api/prospects/[prospectId]/profile
 *
 * Updates one or more manual_* fields on a prospect.
 * Accepts partial updates — only provided fields are written.
 * Requires authentication and tenant ownership of the prospect (enforced by RLS).
 */

const profilePatchSchema = z
  .object({
    manual_display_name: z.string().max(200).nullable().optional(),
    manual_title: z.string().max(200).nullable().optional(),
    manual_company: z.string().max(200).nullable().optional(),
    manual_email: z.string().email().nullable().optional(),
    manual_email_secondary: z.string().email().nullable().optional(),
    manual_phone: z.string().max(50).nullable().optional(),
    manual_phone_label: z.string().max(50).nullable().optional(),
    manual_linkedin_url: z.string().url().nullable().optional(),
    manual_city: z.string().max(100).nullable().optional(),
    manual_state: z.string().max(100).nullable().optional(),
    manual_country: z.string().max(100).nullable().optional(),
    manual_wealth_tier: z
      .enum(["ultra_high", "very_high", "high", "emerging", "unknown"])
      .nullable()
      .optional(),
    pinned_note: z.string().max(500).nullable().optional(),
    lead_owner_id: z.string().uuid().nullable().optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field must be provided",
  });

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

    // 2. Extract route param
    const { prospectId } = await context.params;

    // 3. Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = profilePatchSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const validated = parseResult.data;

    // 4. Build update object (spread validated fields + metadata)
    const updateObj = {
      ...validated,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    // 5. Update the prospect (RLS ensures tenant ownership)
    const { data, error: updateError } = await supabase
      .from("prospects")
      .update(updateObj)
      .eq("id", prospectId)
      .eq("tenant_id", tenantId)
      .select("id")
      .single();

    if (updateError) {
      console.error("Failed to update prospect profile:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Prospect not found" },
        { status: 404 }
      );
    }

    // 6. Determine activity type
    const actionType: "lead_owner_assigned" | "profile_edited" =
      "lead_owner_id" in validated ? "lead_owner_assigned" : "profile_edited";

    // 7. Log activity (fire-and-forget)
    logActivity({
      tenantId,
      userId: user.id,
      actionType,
      targetType: "prospect",
      targetId: prospectId,
      metadata: { fields: Object.keys(validated) },
    }).catch(() => {});

    logProspectActivity({
      prospectId, tenantId, userId: user.id,
      category: 'team', eventType: 'profile_edited',
      title: 'Profile edited',
      metadata: { fields: Object.keys(validated) },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      updated: Object.keys(validated),
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
