import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/global-search?q=query
 * Searches prospects, lists, personas for tenant. For Cmd+K Spotlight overlay.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ prospects: [], lists: [], savedSearches: [] });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = user.app_metadata?.tenant_id as string;
  if (!tenantId) return NextResponse.json({ error: "No tenant" }, { status: 403 });

  const pattern = `%${q}%`;

  const [prospectsRes, listsRes, personasRes] = await Promise.all([
    supabase.from("prospects").select("id, full_name, company, title").eq("tenant_id", tenantId)
      .or(`full_name.ilike.${pattern},company.ilike.${pattern}`).limit(8),
    supabase.from("lists").select("id, name").eq("tenant_id", tenantId).ilike("name", pattern).limit(5),
    supabase.from("personas").select("id, name").eq("tenant_id", tenantId).ilike("name", pattern).limit(5),
  ]);

  return NextResponse.json({
    prospects: prospectsRes.data ?? [],
    lists: listsRes.data ?? [],
    savedSearches: personasRes.data ?? [],
  });
}
