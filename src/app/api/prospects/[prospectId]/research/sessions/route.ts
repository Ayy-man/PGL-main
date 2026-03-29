import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SessionListItem } from "@/types/research";

/**
 * GET /api/prospects/[prospectId]/research/sessions
 *
 * Returns a list of research sessions for the current user + prospect,
 * enriched with first_query and result_count.
 *
 * Query params: none (returns up to 20 most recently updated sessions)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  const { prospectId } = await params;

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

  // --- Fetch sessions ---
  const { data: sessions, error: sessionsError } = await admin
    .from("research_sessions")
    .select("id, created_at, updated_at")
    .eq("prospect_id", prospectId)
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (sessionsError) {
    console.error("[sessions] Query error:", sessionsError);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }

  // --- Enrich sessions in a single query ---
  const sessionIds = (sessions ?? []).map((s: { id: string }) => s.id);

  if (sessionIds.length === 0) {
    return NextResponse.json([]);
  }

  // Fetch all messages for these sessions in one query
  const { data: allMessages } = await admin
    .from("research_messages")
    .select("session_id, role, content, created_at")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true });

  // Build lookup maps from the flat message list
  const firstQueryMap = new Map<string, string | null>();
  const resultCountMap = new Map<string, number>();

  for (const msg of allMessages ?? []) {
    const m = msg as { session_id: string; role: string; content: string | null; created_at: string };
    if (m.role === "user" && !firstQueryMap.has(m.session_id)) {
      firstQueryMap.set(m.session_id, m.content);
    }
    if (m.role === "assistant") {
      resultCountMap.set(m.session_id, (resultCountMap.get(m.session_id) ?? 0) + 1);
    }
  }

  const enriched: SessionListItem[] = (sessions ?? []).map(
    (s: { id: string; created_at: string; updated_at: string }) => ({
      id: s.id,
      first_query: firstQueryMap.get(s.id) ?? null,
      result_count: resultCountMap.get(s.id) ?? 0,
      created_at: s.created_at,
    })
  );

  return NextResponse.json(enriched);
}
