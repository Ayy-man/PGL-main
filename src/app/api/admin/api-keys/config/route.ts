import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { setPlatformConfig } from "@/lib/platform-config";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/api-keys/config
 * Body: { key: "apollo_mock_enrichment", value: boolean }
 *
 * Writes to platform_config. Guarded by super_admin role.
 * Extend the schema as new config keys are added.
 */
const bodySchema = z.discriminatedUnion("key", [
  z.object({
    key: z.literal("apollo_mock_enrichment"),
    value: z.boolean(),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const json = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { key, value } = parsed.data;
    await setPlatformConfig(key, value, user.id);

    return NextResponse.json({ ok: true, key, value });
  } catch (error) {
    console.error("[/api/admin/api-keys/config] error:", error);
    return NextResponse.json(
      { error: "Failed to update platform config" },
      { status: 500 }
    );
  }
}
