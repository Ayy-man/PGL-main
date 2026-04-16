"use client";

import { TourProvider } from "./tour-context";
import { ProductTour } from "./product-tour";
import type { OnboardingState } from "@/types/onboarding";

export function TourTrigger({
  initialOnboardingState,
  userRole,
}: {
  initialOnboardingState: OnboardingState | null | undefined;
  /**
   * Role drives step filtering — assistants get a short tour that skips
   * the write-gated steps (add-to-list, enrich, dossier features) since
   * they can't perform those actions (Phase 42 server-side role guards).
   */
  userRole?: string;
}) {
  // tour_completed === true OR explicit skip -> do not render at all.
  if (initialOnboardingState?.tour_completed) return null;

  return (
    <TourProvider initiallyActive userRole={userRole}>
      <ProductTour />
    </TourProvider>
  );
}
