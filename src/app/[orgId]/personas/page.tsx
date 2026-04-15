import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getPersonas } from "@/lib/personas/queries";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { PersonasLayout } from "./components/personas-layout";
import { ReportIssueButton } from "@/components/issues/report-issue-button";
import { Users } from "lucide-react";
import type { UserRole } from "@/types/auth";
import { ROLE_PERMISSIONS } from "@/types/auth";
import { emptyStateCopy } from "@/lib/onboarding/empty-state-copy";

export default async function PersonasPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const tenantId = user.app_metadata?.tenant_id;
  if (!tenantId) {
    redirect("/login");
  }

  const role = (user.app_metadata?.role as UserRole) || 'assistant';
  const canEdit = ROLE_PERMISSIONS[role]?.canEdit ?? false;

  const personas = await getPersonas(tenantId);

  // Parallel: prospect count + activity check
  const [prospectResult, activityResult] = await Promise.all([
    supabase
      .from("prospects")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("activity_log")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .limit(1),
  ]);

  const prospectCount = prospectResult.count ?? 0;
  const hasActivity = (activityResult.count ?? 0) > 0;

  return (
    <div className="space-y-6 page-enter">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: "Saved Searches" }]} />

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-serif text-2xl sm:text-[32px] md:text-[38px] font-medium"
            style={{ color: "var(--text-primary)", letterSpacing: "-0.5px" }}
          >
            Saved Searches & Living Data
          </h1>
          <p
            className="mt-1 text-[14px] font-light"
            style={{ color: "var(--text-tertiary)" }}
          >
            Your active data streams. These saved searches are constantly updated with
            new leads matching your criteria.
          </p>
        </div>
        <ReportIssueButton
          target={{
            type: "persona",
            snapshot: {
              scope: "personas_index",
              persona_count: personas?.length ?? 0,
              prospect_count: prospectResult.count ?? 0,
              has_activity: (activityResult.count ?? 0) > 0,
              persona_names: (personas ?? []).map((p: { name: string }) => p.name),
            },
          }}
        />
      </div>

      {/* Main content */}
      {personas.length === 0 ? (() => {
        const copy = emptyStateCopy("personas");
        // Route the CTA to /search so clicking it leads to the place where a
        // saved search is actually created (via the "Save this search" flow).
        // The helper's self-referential default is avoided for actionability.
        return (
          <EmptyState
            icon={Users}
            title={copy.title}
            description={copy.body}
          >
            <Button asChild variant="gold-solid" size="sm">
              <Link href={`/${orgId}/search`}>{copy.ctaLabel}</Link>
            </Button>
          </EmptyState>
        );
      })() : (
        <PersonasLayout personas={personas} prospectCount={prospectCount} hasActivity={hasActivity} orgId={orgId} canEdit={canEdit} />
      )}
    </div>
  );
}
