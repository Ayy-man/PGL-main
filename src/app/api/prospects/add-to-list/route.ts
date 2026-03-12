import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addProspectToList } from "@/lib/lists/queries";
import { z } from "zod";

const schema = z.object({
  prospectId: z.string().uuid(),
  listIds: z.array(z.string().uuid()).min(1),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      return NextResponse.json({ error: "No tenant" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { prospectId, listIds } = parsed.data;
    const results = await Promise.allSettled(
      listIds.map((listId) =>
        addProspectToList(listId, prospectId, tenantId, user.id)
      )
    );

    const successCount = results.filter(
      (r) =>
        r.status === "fulfilled" ||
        (r.status === "rejected" &&
          r.reason?.message?.includes("already in list"))
    ).length;

    return NextResponse.json({ addedToLists: successCount });
  } catch (error) {
    console.error("Error adding to list:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
