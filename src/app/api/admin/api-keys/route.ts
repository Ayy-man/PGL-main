import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  INTEGRATION_REGISTRY,
  maskSecret,
  type IntegrationStatus,
  type BreakerState,
  type ConfigStatus,
} from "@/types/admin-api-keys";
import { isApolloMockMode } from "@/lib/platform-config";
import { apolloBreaker } from "@/lib/circuit-breaker/apollo-breaker";

export const dynamic = "force-dynamic";

function getBreakerState(id: string): BreakerState {
  if (id === "apollo") {
    if (apolloBreaker.opened) return "open";
    // opossum exposes halfOpen as a boolean on some versions; guard access
    const halfOpen = (apolloBreaker as unknown as { halfOpen?: boolean }).halfOpen;
    if (halfOpen) return "half_open";
    return "closed";
  }
  // TODO: wire additional breakers as they are exported (contactout, exa, edgar)
  return "none";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.app_metadata?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const mockModeActive = await isApolloMockMode();

    const integrations: IntegrationStatus[] = INTEGRATION_REGISTRY.map((entry) => {
      const envVars = entry.envVarNames.map((name) => {
        const raw = process.env[name];
        return {
          name,
          configured: Boolean(raw && raw.length > 0),
          preview: maskSecret(raw),
        };
      });

      const allConfigured = envVars.every((e) => e.configured);
      const anyConfigured = envVars.some((e) => e.configured);
      const status: ConfigStatus = allConfigured
        ? "configured"
        : anyConfigured
          ? "partial"
          : "missing";

      return {
        id: entry.id,
        label: entry.label,
        category: entry.category,
        description: entry.description,
        docsUrl: entry.docsUrl,
        status,
        envVars,
        breakerState: getBreakerState(entry.id),
        hasMockMode: entry.hasMockMode,
        mockModeActive: entry.id === "apollo" ? mockModeActive : false,
        supportsTest: entry.supportsTest,
      };
    });

    return NextResponse.json({
      integrations,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[/api/admin/api-keys] error:", error);
    return NextResponse.json(
      { error: "Failed to load integration status" },
      { status: 500 }
    );
  }
}
