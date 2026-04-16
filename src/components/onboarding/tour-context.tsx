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
import { subscribeTourEvent } from "@/lib/onboarding/tour-event-bus";
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

  // Event-triggered advance: subscribe to the current step's `advanceOn.event`
  // (if set) and advance when that event fires from anywhere in the app.
  // Special-cases:
  //  - `search_submitted` step also listens to `persona_created` (OR-pair)
  //  - `list_added` navigates to /prospects/<id> using the payload before
  //    advancing, so the D1 (dossier-enriching) step lands on the right page
  React.useEffect(() => {
    if (!isActive || !currentStep) return;
    const step = TOUR_STEPS.find((s) => s.id === currentStep);
    if (!step?.advanceOn) return;

    const unsubs: Array<() => void> = [];
    const advance = () => {
      // Defer to end of current task — emitters fire inside promise
      // resolutions triggered by user clicks; let the primary UI update
      // (close dialog, toast) land first.
      Promise.resolve().then(() => next());
    };

    if (step.advanceOn.event === "list_added") {
      unsubs.push(
        subscribeTourEvent<{ prospectId?: string | null }>(
          "list_added",
          (payload) => {
            const prospectId = payload?.prospectId;
            // If we got a prospect id from the payload AND we have an orgId
            // in the current route, deep-link to the dossier so the next
            // step's anchor is present on the landed page.
            if (prospectId && typeof window !== "undefined") {
              const match = window.location.pathname.match(/^\/([^/]+)\//);
              const orgId = match?.[1];
              if (orgId) {
                // eslint-disable-next-line no-console
                // Deep-link to the prospect's dossier before advancing.
                window.location.assign(`/${orgId}/prospects/${prospectId}`);
                return;
              }
            }
            advance();
          }
        )
      );
    } else {
      unsubs.push(subscribeTourEvent(step.advanceOn.event, advance));
      // The search-try step has an implicit OR: either submitting the NL
      // search OR creating a persona should advance.
      if (step.advanceOn.event === "search_submitted") {
        unsubs.push(subscribeTourEvent("persona_created", advance));
      }
    }

    return () => {
      for (const u of unsubs) u();
    };
  }, [isActive, currentStep, next]);

  return (
    <TourContext.Provider
      value={{ currentStep, isActive, next, previous, skip, complete, restart }}
    >
      {children}
    </TourContext.Provider>
  );
}
