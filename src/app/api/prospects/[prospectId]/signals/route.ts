import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/prospects/[prospectId]/signals
 *
 * Returns paginated prospect signals with per-user is_seen status.
 * Query params: page (default 1), limit (default 10), category (optional filter)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  const { prospectId } = await params;
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

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
  const category = url.searchParams.get("category");
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from("prospect_signals")
    .select("*", { count: "exact" })
    .eq("prospect_id", prospectId)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq("category", category);
  }

  const { data: signals, error, count } = await query;

  if (error) {
    console.error("[signals] Query error:", error);
    return NextResponse.json({ error: "Failed to fetch signals" }, { status: 500 });
  }

  // Fetch signal_views for this user to determine is_seen
  const signalIds = (signals || []).map((s: { id: string }) => s.id);
  let viewedIds: Set<string> = new Set();

  if (signalIds.length > 0) {
    const { data: views } = await supabase
      .from("signal_views")
      .select("signal_id")
      .eq("user_id", user.id)
      .in("signal_id", signalIds);
    viewedIds = new Set((views || []).map((v: { signal_id: string }) => v.signal_id));
  }

  const signalsWithSeen = (signals || []).map((s: Record<string, unknown>) => ({
    ...s,
    is_seen: viewedIds.has(s.id as string),
  }));

  return NextResponse.json({
    signals: signalsWithSeen,
    total: count || 0,
    page,
    limit,
  });
}
