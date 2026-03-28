import { createAdminClient } from "@/lib/supabase/admin";
import type { CreateActivityParams, ProspectActivity, EventType } from "@/types/activity";
import { EVENT_TITLES } from "@/types/activity";

/**
 * Log a prospect activity event to the prospect_activity table.
 *
 * Uses admin client to bypass RLS (called from server actions/API routes
 * that have already validated the user).
 *
 * NEVER throws -- fire-and-forget pattern. Returns null on failure.
 */
export async function logProspectActivity(
  params: CreateActivityParams
): Promise<ProspectActivity | null> {
  try {
    const supabase = createAdminClient();

    const title = params.title || EVENT_TITLES[params.eventType] || params.eventType;

    const { data, error } = await supabase
      .from("prospect_activity")
      .insert({
        prospect_id: params.prospectId,
        tenant_id: params.tenantId,
        user_id: params.userId ?? null,
        category: params.category,
        event_type: params.eventType,
        title,
        note: params.note ?? null,
        metadata: params.metadata ?? {},
        event_at: params.eventAt ?? new Date().toISOString(),
        triggers_status_change: params.triggersStatusChange ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error("[logProspectActivity] Insert failed:", error);
      return null;
    }

    return data as ProspectActivity;
  } catch (error) {
    console.error("[logProspectActivity] Error:", error);
    return null;
  }
}

/**
 * Deduplicate check: returns true if a matching event exists within the dedup window.
 * Used for profile_viewed to prevent spamming (1 per user per prospect per hour).
 */
export async function isDuplicateActivity(
  prospectId: string,
  userId: string,
  eventType: EventType,
  windowMinutes: number = 60
): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("prospect_activity")
      .select("id")
      .eq("prospect_id", prospectId)
      .eq("user_id", userId)
      .eq("event_type", eventType)
      .gte("event_at", cutoff)
      .limit(1);

    if (error) {
      console.error("[isDuplicateActivity] Check failed:", error);
      return false; // On error, allow the log (fail open)
    }

    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
