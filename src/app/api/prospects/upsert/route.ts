import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertProspectFromApollo } from "@/lib/prospects/queries";
import { addProspectToList } from "@/lib/lists/queries";
import { logError } from "@/lib/error-logger";
import { ApiError, handleApiError } from "@/lib/api-error";
import { z } from "zod";
import type { ApolloPerson } from "@/lib/apollo/types";

const upsertRequestSchema = z.object({
  prospect: z.object({
    id: z.string(),
    first_name: z.string().nullable().optional(),
    last_name: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
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
  let tenantId: string | undefined;
  let userId: string | undefined;

  try {
    // 1. Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new ApiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    userId = user.id;

    // 2. Extract tenant_id from session app_metadata
    tenantId = user.app_metadata?.tenant_id as string | undefined;
    if (!tenantId) {
      throw new ApiError("Tenant ID not found in session", "UNAUTHORIZED", 401);
    }

    // 3. Parse and validate request body
    const body = await request.json();
    const parseResult = upsertRequestSchema.safeParse(body);

    if (!parseResult.success) {
      throw new ApiError(
        "Invalid request",
        "VALIDATION_ERROR",
        400,
        parseResult.error.issues
      );
    }

    const { prospect, listIds } = parseResult.data;

    // 4. Upsert prospect from Apollo data
    const upsertedProspect = await upsertProspectFromApollo(
      tenantId!,
      prospect as ApolloPerson
    );

    // 5. Add prospect to all selected lists (idempotent)
    const addResults = await Promise.allSettled(
      listIds.map((listId) =>
        addProspectToList(listId, upsertedProspect.id, tenantId!, userId!)
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
    // ApiError instances (validation, auth) get their specific status/code
    if (error instanceof ApiError) {
      return handleApiError(error);
    }

    console.error("Error upserting prospect:", error);
    logError({
      route: "/api/prospects/upsert",
      method: "POST",
      statusCode: 500,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: (error as Record<string, unknown>)?.code as string | undefined,
      tenantId,
      userId,
    });
    return handleApiError(error);
  }
}
