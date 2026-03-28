import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/prospects/[prospectId]/signals/mark-seen
 *
 * Body: { signalIds: string[] }
 * Upserts signal_views rows for the authenticated user.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  await params; // consume params for Next.js
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

  let body: { signalIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const signalIds = body.signalIds;
  if (!Array.isArray(signalIds) || signalIds.length === 0) {
    return NextResponse.json({ error: "signalIds required" }, { status: 400 });
  }

  // Upsert signal_views — onConflict avoids duplicates for user/signal pairs
  const rows = signalIds.map((signalId) => ({
    signal_id: signalId,
    user_id: user.id,
    tenant_id: tenantId,
    viewed_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("signal_views")
    .upsert(rows, { onConflict: "user_id,signal_id", ignoreDuplicates: true });

  if (error) {
    console.error("[mark-seen] Upsert error:", error);
    return NextResponse.json({ error: "Failed to mark seen" }, { status: 500 });
  }

  return NextResponse.json({ marked: signalIds.length });
}
