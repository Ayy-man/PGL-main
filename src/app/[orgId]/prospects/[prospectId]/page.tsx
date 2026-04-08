import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-logger";
import { logProspectActivity, isDuplicateActivity } from "@/lib/activity";
import { ProfileView } from "@/components/prospect/profile-view";
import { ROLE_PERMISSIONS } from "@/types/auth";
import type { UserRole } from "@/types/auth";

export const dynamic = "force-dynamic";

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

  // Determine canEdit from user role
  const role = (user.app_metadata?.role as UserRole) || "assistant";
  const canEdit = ROLE_PERMISSIONS[role]?.canEdit ?? false;

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
  // Keep backward-compat logActivity call AND add new logProspectActivity with deduplication
  logActivity({
    tenantId,
    userId: user.id,
    actionType: "profile_viewed",
    targetType: "prospect",
    targetId: prospectId,
  }).catch((err) => console.error("[ProspectProfile] logActivity failed:", err));

  // Log to prospect_activity with 1-per-hour deduplication per user
  isDuplicateActivity(prospectId, user.id, "profile_viewed", 60)
    .then((isDup) => {
      if (!isDup) {
        return logProspectActivity({
          prospectId,
          tenantId,
          userId: user.id,
          category: "team",
          eventType: "profile_viewed",
          title: "Viewed profile",
        });
      }
    })
    .catch(() => {});

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

  // Fetch activity events from prospect_activity table
  const { data: activityEntries } = await supabase
    .from("prospect_activity")
    .select("id, prospect_id, tenant_id, user_id, category, event_type, title, note, metadata, event_at, created_at, triggers_status_change")
    .eq("prospect_id", prospectId)
    .order("event_at", { ascending: false })
    .limit(50);

  // Build user display name map from unique user_ids in activity entries
  const activityUserIds = Array.from(
    new Set((activityEntries ?? []).map((e) => e.user_id).filter(Boolean) as string[])
  );
  let activityUsers: Record<string, { full_name: string }> = {};
  if (activityUserIds.length > 0) {
    // Use admin client to bypass RLS — user table RLS may block reading other team members
    const adminClient = createAdminClient();
    const { data: userProfiles } = await adminClient
      .from("users")
      .select("id, full_name")
      .in("id", activityUserIds);
    if (userProfiles) {
      activityUsers = Object.fromEntries(
        userProfiles.map((u) => [u.id, { full_name: u.full_name ?? "" }])
      );
    }
  }

  // Fetch all available lists for this tenant (for "Add to List" dialog)
  const { data: allLists } = await supabase
    .from("lists")
    .select("id, name, description, member_count")
    .order("name", { ascending: true });

  // Fetch prospect tags
  const { data: prospectTags } = await supabase
    .from("prospect_tags")
    .select("id, tag, created_at")
    .eq("prospect_id", prospectId)
    .eq("tenant_id", tenantId)
    .order("created_at");

  const tags = prospectTags?.map((t) => t.tag) ?? [];

  // Fetch initial signals for timeline (first 10, with seen status for this user)
  const { data: initialSignals, count: signalCount } = await supabase
    .from("prospect_signals")
    .select("*", { count: "exact" })
    .eq("prospect_id", prospectId)
    .eq("tenant_id", tenantId)
    .order("event_date", { ascending: false, nullsFirst: false })
    .limit(10);

  // Fetch signal_views for this user to compute is_seen
  const signalIds = (initialSignals || []).map((s: { id: string }) => s.id);
  let viewedSignalIds: Set<string> = new Set();
  if (signalIds.length > 0) {
    const { data: views } = await supabase
      .from("signal_views")
      .select("signal_id")
      .eq("user_id", user.id)
      .in("signal_id", signalIds);
    viewedSignalIds = new Set((views || []).map((v: { signal_id: string }) => v.signal_id));
  }

  const signalsWithSeen = (initialSignals || []).map((s) => ({
    ...s,
    is_seen: viewedSignalIds.has(s.id),
  }));

  // Fetch pinned research notes for this prospect
  const { data: researchNotes } = await supabase
    .from("research_pins")
    .select("edited_headline, edited_summary, created_at")
    .eq("prospect_id", prospectId)
    .eq("tenant_id", tenantId)
    .eq("pin_target", "note")
    .order("created_at", { ascending: false });

  // Fetch team members and tag suggestions in parallel — only if canEdit
  let teamMembers: Array<{ id: string; full_name: string; email: string }> = [];
  let tagSuggestions: string[] = [];

  if (canEdit) {
    const [membersResult, allTagsResult] = await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, email")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("prospect_tags")
        .select("tag")
        .eq("tenant_id", tenantId),
    ]);
    teamMembers = membersResult.data ?? [];
    tagSuggestions = Array.from(new Set(allTagsResult.data?.map((t) => t.tag) ?? []));
  }

  return (
    <ProfileView
      prospect={prospect}
      enrichmentSourceStatus={enrichmentSourceStatus}
      listMemberships={formattedListMemberships}
      isStale={isStale}
      orgId={orgId}
      activityEntries={activityEntries ?? []}
      activityUsers={activityUsers}
      allLists={allLists ?? []}
      canEdit={canEdit}
      teamMembers={teamMembers}
      tags={tags}
      tagSuggestions={tagSuggestions}
      initialSignals={signalsWithSeen}
      signalCount={signalCount || 0}
      researchNotes={researchNotes ?? []}
    />
  );
}
