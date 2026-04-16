"use client";

import * as React from "react";
import {
  TOUR_STEPS,
  type TourStepId,
} from "@/lib/onboarding/tour-steps";
import {
  nextTourStep,
  previousTourStep,
  findFirstPresentStep,
} from "@/lib/onboarding/tour-navigation";
import { updateOnboardingState } from "@/app/actions/onboarding-state";

interface TourContextValue {
  currentStep: TourStepId | null;
  isActive: boolean;
  next: () => void;
  previous: () => void;
  skip: () => void;
  complete: () => void;
  restart: () => void;
}

const TourContext = React.createContext<TourContextValue | null>(null);

export function useTour() {
  const v = React.useContext(TourContext);
  if (!v) throw new Error("useTour must be used inside <TourProvider>");
  return v;
}

export function TourProvider({
  initiallyActive,
  children,
}: {
  initiallyActive: boolean;
  children: React.ReactNode;
}) {
  const [isActive, setIsActive] = React.useState(initiallyActive);
  const [currentStep, setCurrentStep] = React.useState<TourStepId | null>(() => {
    if (!initiallyActive || typeof document === "undefined") return null;
    return findFirstPresentStep(TOUR_STEPS, (sel) => !!document.querySelector(sel));
  });

  // Re-resolve first present step on mount (SSR->CSR, data-tour-id nodes may
  // mount after first render).
  React.useEffect(() => {
    if (!isActive || currentStep) return;
    const id = requestAnimationFrame(() => {
      setCurrentStep(
        findFirstPresentStep(TOUR_STEPS, (sel) => !!document.querySelector(sel))
      );
    });
    return () => cancelAnimationFrame(id);
  }, [isActive, currentStep]);

  const next = React.useCallback(() => {
    // Structural advance. The tour is a multi-page journey — most steps have
    // targets on DIFFERENT pages, so auto-skipping missing targets would end
    // the tour prematurely. If the advanced-to step's target isn't on the
    // current page, ProductTour's fallback card renders with a
    // "Go to [page]" CTA that deep-links via suggestedHref.
    setCurrentStep((s) => (s ? nextTourStep(s) : null));
  }, []);

  const previous = React.useCallback(() => {
    setCurrentStep((s) => (s ? previousTourStep(s) : null));
  }, []);

  const skip = React.useCallback(async () => {
    setIsActive(false);
    setCurrentStep(null);
    await updateOnboardingState({
      tour_completed: true,
      tour_skipped_at: new Date().toISOString(),
    });
  }, []);

  const complete = React.useCallback(async () => {
    setIsActive(false);
    setCurrentStep(null);
    await updateOnboardingState({
      tour_completed: true,
      tour_completed_at: new Date().toISOString(),
    });
  }, []);

  const restart = React.useCallback(async () => {
    await updateOnboardingState({ tour_completed: false });
    setIsActive(true);
    setCurrentStep(
      findFirstPresentStep(TOUR_STEPS, (sel) => !!document.querySelector(sel))
    );
  }, []);

  // Escape = skip
  React.useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, skip]);

  return (
    <TourContext.Provider
      value={{ currentStep, isActive, next, previous, skip, complete, restart }}
    >
      {children}
    </TourContext.Provider>
  );
}
