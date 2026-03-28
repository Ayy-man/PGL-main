import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/prospects/[prospectId]/research/sessions/[sessionId]
 *
 * Returns the full message thread for a research session.
 * Messages are ordered by created_at ASC (oldest first) to match chat convention.
 */
export async function GET(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ prospectId: string; sessionId: string }>;
  }
) {
  const { sessionId } = await params;

  // --- Auth ---
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = user.app_metadata?.tenant_id as string;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }

  const admin = createAdminClient();

  // --- Fetch messages ---
  const { data: messages, error: messagesError } = await admin
    .from("research_messages")
    .select("id, role, content, metadata, result_cards, created_at")
    .eq("session_id", sessionId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("[sessions/{id}] Query error:", messagesError);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    session_id: sessionId,
    messages: messages ?? [],
  });
}
