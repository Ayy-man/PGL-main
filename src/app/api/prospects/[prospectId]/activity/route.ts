import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logProspectActivity } from "@/lib/activity";
import { z } from "zod";

/**
 * GET /api/prospects/[prospectId]/activity
 * POST /api/prospects/[prospectId]/activity
 *
 * GET: List activity events for a prospect.
 *   Query params:
 *     ?category=outreach,data   comma-separated filter
 *     ?limit=50                 default 50, max 200
 *     ?cursor=ISO_date          keyset pagination by event_at
 *
 * POST: Create a new activity event.
 *   Body validated with zod schema.
 *
 * All operations use createClient() — RLS provides tenant isolation for reads.
 * POST uses logProspectActivity (admin client write).
 */

const createSchema = z.object({
  category: z.enum(["outreach", "data", "team", "custom"]),
  eventType: z.string().min(1).max(100),
  title: z.string().min(1).max(500),
  note: z.string().max(5000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  eventAt: z.string().datetime().optional(),
  triggersStatusChange: z.boolean().optional(),
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
    const searchParams = request.nextUrl.searchParams;

    // Parse query params
    const categoryParam = searchParams.get("category");
    const categories = categoryParam
      ? categoryParam.split(",").map((c) => c.trim()).filter(Boolean)
      : null;

    const limitParam = searchParams.get("limit");
    const parsedLimit = Math.min(
      Math.max(1, parseInt(limitParam ?? "50", 10) || 50),
      200
    );

    const cursor = searchParams.get("cursor");

    // Build query — RLS client ensures tenant isolation
    let query = supabase
      .from("prospect_activity")
      .select(
        "id, prospect_id, tenant_id, user_id, category, event_type, title, note, metadata, event_at, created_at, triggers_status_change"
      )
      .eq("prospect_id", prospectId)
      .order("event_at", { ascending: false })
      .limit(parsedLimit);

    if (categories && categories.length > 0) {
      query = query.in("category", categories);
    }

    if (cursor) {
      query = query.lt("event_at", cursor);
    }

    const { data: events, error: fetchError } = await query;

    if (fetchError) {
      console.error("[activity GET] Failed to fetch events:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch activity events" },
        { status: 500 }
      );
    }

    const eventList = events ?? [];

    // Collect unique user IDs to look up display names
    const userIds = Array.from(
      new Set(eventList.map((e) => e.user_id).filter(Boolean) as string[])
    );

    let usersMap: Record<string, { full_name: string }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profiles) {
        usersMap = Object.fromEntries(
          profiles.map((p) => [p.id, { full_name: p.full_name ?? "" }])
        );
      }
    }

    const hasMore = eventList.length === parsedLimit;

    return NextResponse.json({ events: eventList, users: usersMap, hasMore });
  } catch (error) {
    console.error("[activity GET] Error:", error);
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
    const { user, tenantId, authError } = await authenticate();
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

    const parseResult = createSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      category,
      eventType,
      title,
      note,
      metadata,
      eventAt,
      triggersStatusChange,
    } = parseResult.data;

    // logProspectActivity uses admin client for write — already validated auth above
    const created = await logProspectActivity({
      prospectId,
      tenantId,
      userId: user.id,
      category,
      eventType: eventType as Parameters<typeof logProspectActivity>[0]["eventType"],
      title,
      note: note ?? null,
      metadata,
      eventAt,
      triggersStatusChange,
    });

    if (!created) {
      return NextResponse.json(
        { error: "Failed to create activity event" },
        { status: 500 }
      );
    }

    // Auto-status upgrade for outreach events (fire-and-forget)
    if (category === "outreach") {
      (async () => {
        try {
          const admin = createAdminClient();

          // Fetch current prospect status
          const { data: prospect } = await admin
            .from("prospects")
            .select("status")
            .eq("id", prospectId)
            .single();

          if (!prospect) return;

          const currentStatus = (prospect as { status?: string }).status;
          let newStatus: string | null = null;

          // Upgrade rules: new -> contacted, contacted -> responded (only on 'met')
          if (currentStatus === "new") {
            newStatus = "contacted";
          } else if (currentStatus === "contacted" && eventType === "met") {
            newStatus = "responded";
          }

          // Never downgrade — only upgrade if newStatus is set
          if (newStatus) {
            // Update prospect status
            await admin
              .from("prospects")
              .update({ status: newStatus, updated_at: new Date().toISOString() })
              .eq("id", prospectId);

            // Update the activity event to mark it triggers_status_change
            await admin
              .from("prospect_activity")
              .update({ triggers_status_change: true })
              .eq("id", created.id);

            // Log status_changed event
            await logProspectActivity({
              prospectId,
              tenantId,
              userId: user.id,
              category: "data",
              eventType: "status_changed",
              title: "Status changed",
              metadata: {
                auto: true,
                triggered_by: created.id,
                old_status: currentStatus,
                new_status: newStatus,
              },
            });
          }
        } catch (err) {
          console.error("[activity POST] Auto-status upgrade failed:", err);
        }
      })();
    }

    return NextResponse.json({ event: created }, { status: 201 });
  } catch (error) {
    console.error("[activity POST] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
