"use client";

import { TourProvider } from "./tour-context";
import { ProductTour } from "./product-tour";
import type { OnboardingState } from "@/types/onboarding";

export function TourTrigger({
  initialOnboardingState,
}: {
  initialOnboardingState: OnboardingState | null | undefined;
}) {
  // tour_completed === true OR explicit skip -> do not render at all.
  if (initialOnboardingState?.tour_completed) return null;

  return (
    <TourProvider initiallyActive>
      <ProductTour />
    </TourProvider>
  );
}
