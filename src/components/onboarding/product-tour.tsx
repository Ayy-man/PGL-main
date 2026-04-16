"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TOUR_STEPS } from "@/lib/onboarding/tour-steps";
import { useTour } from "./tour-context";

export function ProductTour() {
  const { currentStep, isActive, next, skip, complete } = useTour();
  const { orgId } = useParams<{ orgId: string }>();
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
            <Button
              size="sm"
              onClick={() => (isLast ? complete() : next())}
            >
              {isLast ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </PopoverContent>
  );

  // If the target element is not found on this page, show a fallback card
  // anchored bottom-right with a "Go to" CTA that deep-links to the page
  // where the step's target lives (via step.suggestedHref).
  if (!anchorEl) {
    const href = step.suggestedHref && orgId ? step.suggestedHref(orgId) : null;
    return (
      <div className="fixed bottom-6 right-6 z-50 w-[min(22rem,90vw)] rounded-lg border bg-[var(--bg-floating-elevated,#1a1a1e)] backdrop-blur-sm p-4 shadow-xl">
        <div className="space-y-3">
          <h4 className="font-serif text-base font-semibold">{step.title}</h4>
          <p className="text-sm text-muted-foreground">{step.body}</p>
          {href && (
            <p className="text-xs" style={{ color: "var(--gold-primary)" }}>
              Continue on the next page →
            </p>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              Step {stepIndex} of {TOUR_STEPS.length}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={skip}>
                Skip
              </Button>
              {href ? (
                <Button asChild size="sm">
                  <Link href={href}>Go to page</Link>
                </Button>
              ) : (
                <Button size="sm" onClick={() => (isLast ? complete() : next())}>
                  {isLast ? "Done" : "Next"}
                </Button>
              )}
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
