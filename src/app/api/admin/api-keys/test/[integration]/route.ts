import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runIntegrationTest } from "@/lib/admin/integration-tests";
import { INTEGRATION_REGISTRY, type IntegrationId } from "@/types/admin-api-keys";

export const dynamic = "force-dynamic";

const VALID_IDS = new Set<IntegrationId>(
  INTEGRATION_REGISTRY.map((entry) => entry.id)
);

function isIntegrationId(value: string): value is IntegrationId {
  return VALID_IDS.has(value as IntegrationId);
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ integration: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { integration } = await context.params;
    if (!isIntegrationId(integration)) {
      return NextResponse.json(
        { error: `Unknown integration: ${integration}` },
        { status: 400 }
      );
    }

    const result = await runIntegrationTest(integration);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[/api/admin/api-keys/test] error:", error);
    return NextResponse.json(
      { error: "Test failed unexpectedly" },
      { status: 500 }
    );
  }
}
