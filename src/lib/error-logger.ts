import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Log an API error to the error_log table.
 *
 * NEVER throws — fire-and-forget. Failures go to console only.
 * Call from catch blocks in API routes to surface errors on the admin dashboard.
 */
export async function logError(params: {
  route: string;
  method: string;
  statusCode: number;
  errorMessage: string;
  errorCode?: string;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("error_log").insert({
      route: params.route,
      method: params.method,
      status_code: params.statusCode,
      error_message: params.errorMessage.slice(0, 2000), // cap length
      error_code: params.errorCode ?? null,
      tenant_id: params.tenantId ?? null,
      user_id: params.userId ?? null,
      metadata: params.metadata ?? null,
    });
    if (error) {
      console.error("[logError] insert failed:", error.message);
    }
  } catch (e) {
    console.error("[logError] unexpected:", e);
  }
}
