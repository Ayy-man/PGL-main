import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { refreshSavedSearchProspects } from "@/lib/personas/refresh";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const { searchId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = user.app_metadata?.tenant_id as string;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  // Validate ownership: persona must belong to this tenant
  const { data: persona, error: pErr } = await supabase
    .from("personas")
    .select("id, filters")
    .eq("id", searchId)
    .eq("tenant_id", tenantId)
    .single();

  if (pErr || !persona) {
    return NextResponse.json({ error: "Saved search not found" }, { status: 404 });
  }

  const result = await refreshSavedSearchProspects({
    searchId,
    tenantId,
    filters: persona.filters,
    supabase,
  });

  return NextResponse.json(result);
}
