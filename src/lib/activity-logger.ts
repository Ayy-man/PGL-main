import { createAdminClient } from "@/lib/supabase/admin";

/**
 * All supported activity action types for logging
 */
export type ActionType =
  | "login"
  | "search_executed"
  | "profile_viewed"
  | "profile_enriched"
  | "add_to_list"
  | "remove_from_list"
  | "status_updated"
  | "note_added"
  | "csv_exported"
  | "persona_created"
  | "lookalike_search";

/**
 * Array of all valid action types for validation
 */
export const ACTION_TYPES: ActionType[] = [
  "login",
  "search_executed",
  "profile_viewed",
  "profile_enriched",
  "add_to_list",
  "remove_from_list",
  "status_updated",
  "note_added",
  "csv_exported",
  "persona_created",
  "lookalike_search",
];

/**
 * Parameters for logging an activity
 */
export interface LogActivityParams {
  tenantId: string;
  userId: string;
  actionType: ActionType;
  targetType?: string; // 'prospect' | 'list' | 'persona' | null
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Activity log entry shape (mirrors database table)
 */
export interface ActivityLogEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  action_type: ActionType;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Log an activity to the activity_log table.
 *
 * This function uses the admin/service role client to bypass RLS for writes,
 * since it's called from server actions that have already validated the user.
 *
 * IMPORTANT: This function NEVER throws. Activity logging failures are logged
 * to console but do not break the calling action. This ensures that logging
 * issues never impact core functionality.
 *
 * @param params - Activity logging parameters
 * @returns The inserted activity log entry on success, null on failure
 */
export async function logActivity(
  params: LogActivityParams
): Promise<ActivityLogEntry | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("activity_log")
      .insert({
        tenant_id: params.tenantId,
        user_id: params.userId,
        action_type: params.actionType,
        target_type: params.targetType ?? null,
        target_id: params.targetId ?? null,
        metadata: params.metadata ?? null,
        ip_address: params.ipAddress ?? null,
        user_agent: params.userAgent ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("Activity logging failed:", error);
      return null;
    }

    return data as ActivityLogEntry;
  } catch (error) {
    console.error("Activity logging error:", error);
    return null;
  }
}
