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

  // --- Enrich each session with first_query + result_count ---
  const enriched: SessionListItem[] = await Promise.all(
    (sessions ?? []).map(
      async (s: { id: string; created_at: string; updated_at: string }) => {
        const { data: firstMsg } = await admin
          .from("research_messages")
          .select("content")
          .eq("session_id", s.id)
          .eq("role", "user")
          .order("created_at", { ascending: true })
          .limit(1)
          .single();

        const { count } = await admin
          .from("research_messages")
          .select("*", { count: "exact", head: true })
          .eq("session_id", s.id)
          .eq("role", "assistant");

        return {
          id: s.id,
          first_query: (firstMsg?.content as string | null) ?? null,
          result_count: count ?? 0,
          created_at: s.created_at,
        };
      }
    )
  );

  return NextResponse.json(enriched);
}
