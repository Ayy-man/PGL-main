import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import { stringify } from "csv-stringify";
import { CSV_COLUMNS, formatProspectRow } from "@/lib/csv-export";
import type { Prospect, ListMember } from "@/types/database";

/**
 * GET /api/export/csv?listId={uuid}
 *
 * Export a list to CSV with all enriched prospect data.
 * Streams data in batches to handle 1000+ prospects without OOM.
 * Includes UTF-8 BOM for Excel compatibility.
 *
 * Access: Authenticated users with access to the list (enforced by RLS)
 * Tenant scoping: Automatic via RLS
 *
 * Query params:
 * - listId: UUID of the list to export (required)
 */
export async function GET(request: Request) {
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

    const tenantId = user.app_metadata?.tenant_id as string | undefined;
    const userId = user.id;

    if (!tenantId) {
      return NextResponse.json(
        { error: "User not associated with a tenant" },
        { status: 400 }
      );
    }

    // 2. Extract and validate query parameters
    const { searchParams } = new URL(request.url);
    const listId = searchParams.get("listId");

    if (!listId) {
      return NextResponse.json(
        { error: "Missing required parameter: listId" },
        { status: 400 }
      );
    }

    // 3. Verify user has access to the list (RLS will enforce this)
    const { data: list, error: listError } = await supabase
      .from("lists")
      .select("id, name, member_count")
      .eq("id", listId)
      .single();

    if (listError || !list) {
      return NextResponse.json(
        { error: "List not found or access denied" },
        { status: 404 }
      );
    }

    // 4. Create CSV stringifier with BOM for Excel compatibility
    const stringifier = stringify({
      header: true,
      bom: true, // UTF-8 BOM for Excel
      columns: CSV_COLUMNS,
    });

    // 5. Build a ReadableStream that fetches and streams data in batches
    const BATCH_SIZE = 100;
    let offset = 0;
    let hasMore = true;

    const stream = new ReadableStream({
      async start(controller) {
        // Set up stringifier event handlers
        stringifier.on("readable", () => {
          let chunk: Buffer;
          while ((chunk = stringifier.read()) !== null) {
            controller.enqueue(chunk);
          }
        });

        stringifier.on("end", () => {
          controller.close();
        });

        stringifier.on("error", (err) => {
          console.error("CSV stringifier error:", err);
          controller.error(err);
        });

        // Fetch and process data in batches
        while (hasMore) {
          const { data: members, error: membersError } = await supabase
            .from("list_members")
            .select(
              `
              id,
              status,
              notes,
              prospects (
                id,
                full_name,
                title,
                company,
                location,
                work_email,
                linkedin_url,
                contact_data,
                web_data,
                insider_data,
                ai_summary
              )
            `
            )
            .eq("list_id", listId)
            .range(offset, offset + BATCH_SIZE - 1)
            .order("created_at", { ascending: true });

          if (membersError) {
            console.error("Failed to fetch list members:", membersError);
            stringifier.end();
            controller.error(
              new Error("Failed to fetch list members for export")
            );
            return;
          }

          if (!members || members.length === 0) {
            hasMore = false;
            break;
          }

          // Format and write each row
          for (const member of members) {
            if (member.prospects && !Array.isArray(member.prospects)) {
              const prospect = member.prospects as unknown as Prospect;
              const listMember = member as unknown as ListMember;
              const row = formatProspectRow(prospect, listMember);
              stringifier.write(row);
            }
          }

          offset += BATCH_SIZE;
          hasMore = members.length === BATCH_SIZE;
        }

        // Close the stringifier when done
        stringifier.end();

        // Log the export activity (fire-and-forget)
        logActivity({
          tenantId,
          userId,
          actionType: "csv_exported",
          targetType: "list",
          targetId: listId,
          metadata: {
            listName: list.name,
            memberCount: list.member_count,
          },
        }).catch((err) => {
          console.error("Failed to log csv_exported activity:", err);
        });
      },
    });

    // 6. Return streaming response
    const filename = `prospects-${list.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.csv`;

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("CSV export error:", error);
    return NextResponse.json(
      {
        error: "Failed to export CSV",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
