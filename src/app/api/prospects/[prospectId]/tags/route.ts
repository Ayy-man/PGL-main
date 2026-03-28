import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { logProspectActivity } from "@/lib/activity";
import { z } from "zod";

/**
 * GET /api/prospects/[prospectId]/tags
 * POST /api/prospects/[prospectId]/tags
 * DELETE /api/prospects/[prospectId]/tags
 *
 * Tag CRUD for a prospect.
 * GET optionally accepts ?suggestions=true to also return tenant-wide tag suggestions.
 * POST normalizes the tag to lowercase.
 * DELETE removes by normalized tag name.
 *
 * All operations use createClient() — RLS provides tenant isolation.
 */

const tagBodySchema = z.object({
  tag: z.string().min(1).max(100),
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

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ prospectId: string }> }
) {
  try {
    const { supabase, user, tenantId, authError } = await authenticate();
    if (authError || !user || !tenantId) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { prospectId } = await context.params;
    const includeSuggestions =
      request.nextUrl.searchParams.get("suggestions") === "true";

    // Fetch tags for this prospect
    const { data: tags, error: tagsError } = await supabase
      .from("prospect_tags")
      .select("id, tag, created_at")
      .eq("prospect_id", prospectId)
      .eq("tenant_id", tenantId)
      .order("created_at");

    if (tagsError) {
      console.error("Failed to fetch prospect tags:", tagsError);
      return NextResponse.json(
        { error: "Failed to fetch tags" },
        { status: 500 }
      );
    }

    const response: { tags: typeof tags; suggestions?: string[] } = {
      tags: tags ?? [],
    };

    // Optionally include tenant-wide suggestions
    if (includeSuggestions) {
      const { data: allTags, error: suggestionsError } = await supabase
        .from("prospect_tags")
        .select("tag")
        .eq("tenant_id", tenantId);

      if (!suggestionsError && allTags) {
        response.suggestions = Array.from(new Set(allTags.map((r) => r.tag))).sort();
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Tags GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ prospectId: string }> }
) {
  try {
    const { supabase, user, tenantId, authError } = await authenticate();
    if (authError || !user || !tenantId) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { prospectId } = await context.params;

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = tagBodySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // Normalize tag to lowercase
    const tag = parseResult.data.tag.trim().toLowerCase();

    // Insert tag
    const { data, error: insertError } = await supabase
      .from("prospect_tags")
      .insert({
        prospect_id: prospectId,
        tenant_id: tenantId,
        tag,
        created_by: user.id,
      })
      .select("id, tag, created_at")
      .single();

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Tag already exists" },
          { status: 409 }
        );
      }
      console.error("Failed to insert tag:", insertError);
      return NextResponse.json(
        { error: "Failed to add tag" },
        { status: 500 }
      );
    }

    // Log activity (fire-and-forget)
    logActivity({
      tenantId,
      userId: user.id,
      actionType: "tag_added",
      targetType: "prospect",
      targetId: prospectId,
      metadata: { tag },
    }).catch(() => {});

    logProspectActivity({
      prospectId, tenantId, userId: user.id,
      category: 'team', eventType: 'tag_added',
      title: 'Tag added',
      metadata: { tag },
    }).catch(() => {});

    return NextResponse.json({ tag: data }, { status: 201 });
  } catch (error) {
    console.error("Tags POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ prospectId: string }> }
) {
  try {
    const { supabase, user, tenantId, authError } = await authenticate();
    if (authError || !user || !tenantId) {
      return NextResponse.json({ error: authError }, { status: 401 });
    }

    const { prospectId } = await context.params;

    // Parse and validate body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parseResult = tagBodySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // Normalize tag to lowercase
    const tag = parseResult.data.tag.trim().toLowerCase();

    // Delete the tag
    const { error: deleteError } = await supabase
      .from("prospect_tags")
      .delete()
      .eq("prospect_id", prospectId)
      .eq("tenant_id", tenantId)
      .eq("tag", tag);

    if (deleteError) {
      console.error("Failed to delete tag:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove tag" },
        { status: 500 }
      );
    }

    // Log activity (fire-and-forget)
    logActivity({
      tenantId,
      userId: user.id,
      actionType: "tag_removed",
      targetType: "prospect",
      targetId: prospectId,
      metadata: { tag },
    }).catch(() => {});

    logProspectActivity({
      prospectId, tenantId, userId: user.id,
      category: 'team', eventType: 'tag_removed',
      title: 'Tag removed',
      metadata: { tag },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Tags DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
