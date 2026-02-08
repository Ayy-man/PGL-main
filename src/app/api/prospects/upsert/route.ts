import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertProspectFromApollo } from "@/lib/prospects/queries";
import { addProspectToList } from "@/lib/lists/queries";
import { z } from "zod";
import type { ApolloPerson } from "@/lib/apollo/types";

const upsertRequestSchema = z.object({
  prospect: z.object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    name: z.string(),
    title: z.string().optional(),
    organization_name: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    email: z.string().optional(),
    email_status: z.string().optional(),
    phone_numbers: z
      .array(
        z.object({
          raw_number: z.string(),
          sanitized_number: z.string().optional(),
          type: z.string().optional(),
        })
      )
      .optional(),
    linkedin_url: z.string().optional(),
    photo_url: z.string().optional(),
  }),
  listIds: z.array(z.string()).min(1, "At least one list must be selected"),
});

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Extract tenant_id from session app_metadata
    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant ID not found in session" },
        { status: 401 }
      );
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const parseResult = upsertRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { prospect, listIds } = parseResult.data;

    // 4. Upsert prospect from Apollo data
    const upsertedProspect = await upsertProspectFromApollo(
      tenantId,
      prospect as ApolloPerson
    );

    // 5. Add prospect to all selected lists (idempotent)
    const addResults = await Promise.allSettled(
      listIds.map((listId) =>
        addProspectToList(listId, upsertedProspect.id, tenantId, user.id)
      )
    );

    // Count successful adds (ignore "already in list" errors)
    const successfulAdds = addResults.filter((result) => {
      if (result.status === "fulfilled") return true;
      if (result.status === "rejected") {
        // If error is "Prospect already in list", treat as success (idempotent)
        return result.reason?.message?.includes("already in list");
      }
      return false;
    }).length;

    // 6. Return success response
    return NextResponse.json({
      prospect: {
        id: upsertedProspect.id,
        name: upsertedProspect.full_name,
      },
      addedToLists: successfulAdds,
    });
  } catch (error) {
    console.error("Error upserting prospect:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
