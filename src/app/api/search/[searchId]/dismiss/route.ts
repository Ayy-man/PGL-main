import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const dismissSchema = z.object({
  action: z.enum(["dismiss", "bulk-dismiss", "undo"]),
  apolloPersonIds: z.array(z.string()).min(1),
});

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

  // Validate ownership
  const { data: persona } = await supabase
    .from("personas")
    .select("id")
    .eq("id", searchId)
    .eq("tenant_id", tenantId)
    .single();

  if (!persona) {
    return NextResponse.json({ error: "Saved search not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = dismissSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { action, apolloPersonIds } = parsed.data;

  if (action === "dismiss" || action === "bulk-dismiss") {
    const { error } = await supabase
      .from("saved_search_prospects")
      .update({
        status: "dismissed",
        dismissed_at: new Date().toISOString(),
        dismissed_by: user.id,
      })
      .eq("saved_search_id", searchId)
      .in("apollo_person_id", apolloPersonIds);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else if (action === "undo") {
    const { error } = await supabase
      .from("saved_search_prospects")
      .update({
        status: "active",
        dismissed_at: null,
        dismissed_by: null,
        is_new: false, // Do NOT re-badge as NEW on undo
      })
      .eq("saved_search_id", searchId)
      .in("apollo_person_id", apolloPersonIds);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
