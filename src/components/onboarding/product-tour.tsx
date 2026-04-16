"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TOUR_STEPS } from "@/lib/onboarding/tour-steps";
import { nextTourStep } from "@/lib/onboarding/tour-navigation";
import { useTour } from "./tour-context";

export function ProductTour() {
  const { currentStep, isActive, next, skip, complete } = useTour();
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const step = React.useMemo(
    () => TOUR_STEPS.find((s) => s.id === currentStep),
    [currentStep]
  );
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!step) {
      setAnchorEl(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(step.targetSelector);
    setAnchorEl(el);
  }, [step]);

  // Fix 1 — Single-click Next that also auto-navigates cross-page.
  // If the NEXT step's target isn't on the current page and that step has
  // a suggestedHref, push to the page BEFORE advancing tour state. Collapses
  // the previous two-click (Next -> fallback card -> Go to page) into one.
  const handleNext = React.useCallback(() => {
    if (!step) return;
    const isTerminal = step.id === TOUR_STEPS[TOUR_STEPS.length - 1].id;
    if (isTerminal) {
      complete();
      return;
    }
    const nextId = nextTourStep(step.id);
    const nextStep = nextId
      ? TOUR_STEPS.find((s) => s.id === nextId)
      : null;
    if (nextStep && orgId) {
      const targetExists =
        document.querySelector(nextStep.targetSelector) !== null;
      if (!targetExists && nextStep.suggestedHref) {
        router.push(nextStep.suggestedHref(orgId));
      }
    }
    next();
  }, [step, orgId, next, complete, router]);

  // Virtual ref for PopoverAnchor — memoized so Radix observes the same ref
  // object across renders. Radix's popper calls .current.getBoundingClientRect()
  // and HTMLElement satisfies the Measurable contract.
  const virtualRef = React.useMemo(
    () => ({ current: anchorEl }),
    [anchorEl]
  );

  if (!isActive || !step) return null;

  const isLast = step.id === TOUR_STEPS[TOUR_STEPS.length - 1].id;
  const stepIndex = TOUR_STEPS.findIndex((s) => s.id === step.id) + 1;

  const content = (
    <PopoverContent side={step.placement} align="start">
      <div className="space-y-3">
        <h4 className="font-serif text-base font-semibold">{step.title}</h4>
        <p className="text-sm text-muted-foreground">{step.body}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            Step {stepIndex} of {TOUR_STEPS.length}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={skip}>
              Skip
            </Button>
            <Button size="sm" onClick={handleNext}>
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </PopoverContent>
  );

  // Safety-net fallback: target element not present on current page (user
  // manually navigated somewhere weird, or a target hasn't mounted yet).
  // Shows the step in a fixed bottom-right card. Next still works — it
  // either auto-navigates via handleNext (Fix 1) or advances step state.
  if (!anchorEl) {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-[min(22rem,90vw)] rounded-lg border bg-[var(--bg-floating-elevated,#1a1a1e)] backdrop-blur-sm p-4 shadow-xl">
        <div className="space-y-3">
          <h4 className="font-serif text-base font-semibold">{step.title}</h4>
          <p className="text-sm text-muted-foreground">{step.body}</p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              Step {stepIndex} of {TOUR_STEPS.length}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={skip}>
                Skip
              </Button>
              <Button size="sm" onClick={handleNext}>
                {isLast ? "Done" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Popover open>
      <PopoverAnchor virtualRef={virtualRef} />
      {content}
    </Popover>
  );
}
