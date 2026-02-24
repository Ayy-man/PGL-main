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
  const { prospectId } = await params;

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
  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .select(
      `
      id,
      tenant_id,
      apollo_id,
      first_name,
      last_name,
      full_name,
      title,
      company,
      location,
      work_email,
      work_phone,
      personal_email,
      personal_phone,
      linkedin_url,
      publicly_traded_symbol,
      company_cik,
      enrichment_status,
      last_enriched_at,
      contact_data,
      web_data,
      insider_data,
      ai_summary,
      enrichment_source_status,
      created_at,
      updated_at
    `
    )
    .eq("id", prospectId)
    .single();

  if (prospectError || !prospect) {
    return notFound();
  }

  // Log activity: profile_viewed
  await logActivity({
    tenantId,
    userId: user.id,
    actionType: "profile_viewed",
    targetType: "prospect",
    targetId: prospectId,
  });

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
  if (
    isStale &&
    prospect.enrichment_status !== "in_progress"
  ) {
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

  // Parse enrichment source status
  const enrichmentSourceStatus = (prospect.enrichment_source_status as Record<
    string,
    "pending" | "in_progress" | "complete" | "failed" | "skipped"
  >) || {
    contactout: "pending",
    exa: "pending",
    sec: "pending",
    claude: "pending",
  };

  // Format list memberships
  const formattedListMemberships =
    listMemberships?.map((m) => ({
      listId: m.list_id,
      listName: (m.lists as unknown as { name: string })?.name || "Unknown List",
      status: m.status,
      addedAt: m.added_at,
    })) || [];

  return (
    <ProfileView
      prospect={prospect}
      enrichmentSourceStatus={enrichmentSourceStatus}
      listMemberships={formattedListMemberships}
      isStale={isStale}
    />
  );
}
