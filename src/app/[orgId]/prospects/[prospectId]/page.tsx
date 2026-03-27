import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { ProfileView } from "@/components/prospect/profile-view";

/**
 * Prospect Profile Page
 *
 * Displays comprehensive prospect information including:
 * - Basic info (name, title, company, location)
 * - Contact data (work + personal)
 * - Enrichment status indicators
 * - AI-generated summary
 * - Wealth signals (web mentions, SEC transactions)
 * - List memberships
 * - Activity log
 *
 * Automatically triggers lazy enrichment if data is missing or stale (>7 days).
 *
 * Covers: PROF-01, PROF-07, PROF-09, PROF-10
 */
export default async function ProspectProfilePage({
  params,
}: {
  params: Promise<{ orgId: string; prospectId: string }>;
}) {
  const { orgId, prospectId } = await params;

  // Validate user session
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return notFound();
  }

  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (!tenantId) {
    return notFound();
  }

  // Fetch prospect data from Supabase (with RLS)
  // Use select('*') to avoid failing on columns that haven't been added yet
  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", prospectId)
    .single();

  if (prospectError) {
    // PGRST116 = "JSON object requested, multiple (or no) rows returned" → genuine not found
    if (prospectError.code === "PGRST116") {
      return notFound();
    }
    // Any other error (missing column, RLS, network) — surface it instead of masking as 404
    console.error("[ProspectProfile] Supabase query error:", {
      code: prospectError.code,
      message: prospectError.message,
      details: prospectError.details,
      hint: prospectError.hint,
      prospectId,
    });
    throw new Error(`Failed to load prospect: ${prospectError.message}`);
  }

  if (!prospect) {
    return notFound();
  }

  // Log activity: profile_viewed (fire-and-forget, don't block render)
  logActivity({
    tenantId,
    userId: user.id,
    actionType: "profile_viewed",
    targetType: "prospect",
    targetId: prospectId,
  }).catch((err) => console.error("[ProspectProfile] logActivity failed:", err));

  // Check if enrichment needed (missing data or stale >7 days)
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const lastEnriched = prospect.last_enriched_at
    ? new Date(prospect.last_enriched_at).getTime()
    : 0;
  const isStale =
    prospect.enrichment_status !== "complete" ||
    lastEnriched === 0 ||
    now - lastEnriched >= SEVEN_DAYS_MS;

  // If enrichment needed and not already in progress, trigger it (fire-and-forget)
  if (isStale && prospect.enrichment_status !== "in_progress") {
    // Fire-and-forget: trigger enrichment without waiting for response
    const cookieStore = await cookies();
    fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/prospects/${prospectId}/enrich`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieStore.toString(),
        },
      }
    ).catch((error) => {
      console.error("Failed to trigger enrichment:", error);
    });
  }

  // Fetch list memberships for this prospect
  const { data: listMemberships } = await supabase
    .from("list_members")
    .select(
      `
      id,
      list_id,
      status,
      added_at,
      lists (
        id,
        name
      )
    `
    )
    .eq("prospect_id", prospectId)
    .order("added_at", { ascending: false });

  // Parse enrichment source status — DB stores {source: {status, at, error?}} objects,
  // but ProfileView expects Record<string, SourceStatus> (flat strings)
  const rawSourceStatus = (prospect.enrichment_source_status as Record<
    string,
    string | { status: string; at?: string; error?: string }
  >) || {};
  const enrichmentSourceStatus: Record<
    string,
    "pending" | "in_progress" | "complete" | "failed" | "skipped" | "circuit_open"
  > = {
    contactout: "pending",
    exa: "pending",
    sec: "pending",
    claude: "pending",
  };
  for (const [key, val] of Object.entries(rawSourceStatus)) {
    if (typeof val === "string") {
      enrichmentSourceStatus[key] = val as typeof enrichmentSourceStatus[string];
    } else if (val && typeof val === "object" && "status" in val) {
      enrichmentSourceStatus[key] = val.status as typeof enrichmentSourceStatus[string];
    }
  }

  // Format list memberships
  const formattedListMemberships =
    listMemberships?.map((m) => ({
      listId: m.list_id,
      listName: (m.lists as unknown as { name: string })?.name || "Unknown List",
      status: m.status,
      addedAt: m.added_at,
    })) || [];

  // Fetch activity logs for this prospect
  const { data: activityEntries } = await supabase
    .from("activity_logs")
    .select("id, action_type, user_id, created_at, metadata")
    .eq("target_id", prospectId)
    .eq("target_type", "prospect")
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch all available lists for this tenant (for "Add to List" dialog)
  const { data: allLists } = await supabase
    .from("lists")
    .select("id, name, description, member_count")
    .order("name", { ascending: true });

  return (
    <ProfileView
      prospect={prospect}
      enrichmentSourceStatus={enrichmentSourceStatus}
      listMemberships={formattedListMemberships}
      isStale={isStale}
      orgId={orgId}
      activityEntries={activityEntries ?? []}
      allLists={allLists ?? []}
    />
  );
}
