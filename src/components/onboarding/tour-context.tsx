"use client";

import * as React from "react";
import {
  TOUR_STEPS,
  type TourStepId,
} from "@/lib/onboarding/tour-steps";
import { findFirstPresentStep } from "@/lib/onboarding/tour-navigation";
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
  userRole,
  children,
}: {
  initiallyActive: boolean;
  userRole?: string;
  children: React.ReactNode;
}) {
  // Filter steps by role. Assistants skip the 8 write-gated steps
  // (C1-E5) since they can't add to lists or enrich (Phase 42 server-
  // side guards). Everyone else sees the full 15 steps.
  const steps = React.useMemo(() => {
    if (userRole === "assistant") {
      return TOUR_STEPS.filter((s) => !s.hiddenForAssistant);
    }
    return [...TOUR_STEPS];
  }, [userRole]);

  const [isActive, setIsActive] = React.useState(initiallyActive);
  // Always start at step 1 — never skip ahead based on which anchors happen
  // to be in the DOM. The tour is designed as a sequential journey; if the
  // anchor for step 1 isn't present on the current page, product-tour.tsx
  // shows a center-screen fallback card with a Next that auto-navigates.
  const [currentStep, setCurrentStep] = React.useState<TourStepId | null>(() => {
    if (!initiallyActive) return null;
    return steps[0]?.id ?? null;
  });

  // No re-resolve needed — we always start at step 0, not at "first visible".

  const next = React.useCallback(() => {
    // Structural advance using the ROLE-FILTERED step list, not all TOUR_STEPS.
    // Assistants' "next" after search-try (step B4) should be null (tour end),
    // not dossier steps they can't reach.
    setCurrentStep((s) => {
      if (!s) return null;
      const i = steps.findIndex((step) => step.id === s);
      if (i === -1 || i === steps.length - 1) return null;
      return steps[i + 1].id;
    });
  }, [steps]);

  const previous = React.useCallback(() => {
    setCurrentStep((s) => {
      if (!s) return null;
      const i = steps.findIndex((step) => step.id === s);
      if (i <= 0) return null;
      return steps[i - 1].id;
    });
  }, [steps]);

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
      findFirstPresentStep(steps, (sel) => !!document.querySelector(sel))
    );
  }, [steps]);

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

  // Skip-ahead: if the user performs a search (NL submit OR persona create)
  // during ANY step before `results-header`, jump the tour straight to
  // `results-header`. Users who already know how the product works don't
  // need to click Next through every explanatory step when they've
  // visibly understood and acted.
  //
  // Deliberately global (not gated to a specific step's advanceOn) so the
  // user can search at any point in the dashboard/discover sequence and
  // the tour will meet them at the results.
  React.useEffect(() => {
    if (!isActive || !currentStep) return;
    // Only skip-ahead if current step is BEFORE results-header in the
    // filtered step list (assistants don't see results-header, so they
    // naturally never hit this).
    const currentIdx = steps.findIndex((s) => s.id === currentStep);
    const resultsIdx = steps.findIndex((s) => s.id === "results-header");
    if (resultsIdx === -1) return; // role doesn't include results step
    if (currentIdx === -1 || currentIdx >= resultsIdx) return;

    const jumpToResults = () => {
      Promise.resolve().then(() => setCurrentStep("results-header"));
    };
    const unsubs = [
      subscribeTourEvent("search_submitted", jumpToResults),
      subscribeTourEvent("persona_created", jumpToResults),
    ];
    return () => {
      for (const u of unsubs) u();
    };
  }, [isActive, currentStep, steps]);

  return (
    <TourContext.Provider
      value={{ currentStep, isActive, next, previous, skip, complete, restart }}
    >
      {children}
    </TourContext.Provider>
  );
}
