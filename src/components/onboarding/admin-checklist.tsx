"use client";

import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  deriveChecklist,
  type ChecklistItem,
} from "@/lib/onboarding/checklist";
import type { OnboardingState } from "@/types/onboarding";

interface AdminChecklistProps {
  state: OnboardingState | null;
  tenant: { logo_url: string | null; theme: string | null };
  personaCount: number;
  orgId: string;
}

/**
 * Phase 41-04 — Admin onboarding checklist card. Rendered at the top of the
 * tenant admin dashboard when any of the 4 gating actions is still
 * incomplete (derivation logic in `@/lib/onboarding/checklist`).
 *
 * Collapse behavior (per CONTEXT "reduce surface area"): when all 4 items
 * are complete, this component renders `null`. The parent page is also
 * expected to gate on `isChecklistComplete` before mounting — this
 * null-return is defense-in-depth.
 */
export function AdminOnboardingChecklist({
  state,
  tenant,
  personaCount,
  orgId,
}: AdminChecklistProps) {
  const items = deriveChecklist({ state, tenant, personaCount, orgId });
  const completed = items.filter((i) => i.complete).length;

  // Hide entirely when complete — no celebration row, per CONTEXT tilt.
  if (completed === items.length) return null;

  return (
    <Card className="mb-6" data-tour-id="onboarding-checklist">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Get your account set up</span>
          <span
            className="text-xs font-normal"
            style={{ color: "var(--text-tertiary)" }}
          >
            {completed} of {items.length} complete
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={completed} max={items.length} className="mb-4" />
        <ul className="space-y-2">
          {items.map((item) => (
            <ChecklistRow key={item.key} item={item} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {item.complete ? (
          <Check
            className="h-4 w-4 shrink-0"
            style={{ color: "var(--gold-primary)" }}
          />
        ) : (
          <Circle
            className="h-4 w-4 shrink-0"
            style={{ color: "var(--text-tertiary)" }}
          />
        )}
        <span
          className={
            item.complete
              ? "text-sm line-through"
              : "text-sm"
          }
          style={{
            color: item.complete
              ? "var(--text-tertiary)"
              : "var(--text-primary)",
          }}
        >
          {item.label}
        </span>
      </div>
      {!item.complete && (
        <Button asChild size="sm" variant="ghost">
          <Link href={item.ctaHref}>Go</Link>
        </Button>
      )}
    </li>
  );
}
