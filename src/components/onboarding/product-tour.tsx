"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TOUR_STEPS } from "@/lib/onboarding/tour-steps";
import { nextTourStep } from "@/lib/onboarding/tour-navigation";
import { useTour } from "./tour-context";

export function ProductTour() {
  const { currentStep, isActive, next, previous, skip, complete } = useTour();
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
    // Try immediately — covers same-page step advances where the anchor
    // is already in the DOM.
    const el = document.querySelector<HTMLElement>(step.targetSelector);
    if (el) { setAnchorEl(el); return; }

    // Not found yet: retry after one animation frame (handles client
    // components that render synchronously but after the effect). If
    // still missing (e.g. Suspense boundary still showing fallback after
    // a page navigation), retry once more after 300ms.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const raf = requestAnimationFrame(() => {
      const el2 = document.querySelector<HTMLElement>(step.targetSelector);
      if (el2) { setAnchorEl(el2); return; }
      timer = setTimeout(() => {
        setAnchorEl(document.querySelector<HTMLElement>(step.targetSelector));
      }, 300);
    });
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [step]);

  // Fix 2 — Auto-advance on organic interaction with the current step's
  // target. If the user focuses the NL search bar, types in it, or clicks a
  // button inside the bulk actions bar / profile summary / etc., advance the
  // tour without requiring a Next click. One-shot: first meaningful event
  // advances and listeners detach.
  //
  // Events listened: click, focus (capture), input (capture). NOT:
  // mouseenter/mouseover/scroll/mousemove — those would over-fire and make
  // the tour feel twitchy.
  React.useEffect(() => {
    if (!anchorEl) return;
    let fired = false;
    const advance = () => {
      if (fired) return;
      fired = true;
      next();
    };
    anchorEl.addEventListener("click", advance);
    anchorEl.addEventListener("focus", advance, true);
    anchorEl.addEventListener("input", advance, true);
    return () => {
      anchorEl.removeEventListener("click", advance);
      anchorEl.removeEventListener("focus", advance, true);
      anchorEl.removeEventListener("input", advance, true);
    };
  }, [anchorEl, next]);

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

  // 10s enrichment timeout: if the current step is waiting on
  // `enrichment_complete` and the Realtime payload doesn't arrive in time,
  // expose a "Continue anyway" Next button with a softened failure message.
  // If the event fires within 10s, the tour context auto-advances (context
  // effect listens) and this timeout state is cleaned up on step change.
  const isWaitingForEnrichment =
    step?.advanceOn?.event === "enrichment_complete";
  const [timedOut, setTimedOut] = React.useState(false);
  React.useEffect(() => {
    setTimedOut(false);
    if (!isWaitingForEnrichment) return;
    const handle = window.setTimeout(() => setTimedOut(true), 10_000);
    return () => window.clearTimeout(handle);
  }, [isWaitingForEnrichment, step?.id]);

  if (!isActive || !step) return null;

  const isLast = step.id === TOUR_STEPS[TOUR_STEPS.length - 1].id;
  const stepIndex = TOUR_STEPS.findIndex((s) => s.id === step.id) + 1;

  // Copy shown when enrichment times out — frames the failure honestly
  // without blocking the tour.
  const timedOutBody =
    "Enrichment didn't complete — rate limits or missing data sometimes cause this. We'll retry in the background. Continue anyway?";
  const effectiveBody =
    isWaitingForEnrichment && timedOut ? timedOutBody : step.body;
  // While waiting for enrichment, the Next button is hidden (event-driven).
  // Only surface it when timeout fires (and as usual on all other steps).
  const showNextButton = !isWaitingForEnrichment || timedOut;

  const isFirst = stepIndex === 1;

  // JSX variable (not a component) so it doesn't cause remount on every render
  // Layout: [← Back] [4 / 15 — center] [Skip | Next]
  const tourFooter = (
    <div className="flex items-center pt-1">
      {/* Left: Back (placeholder div keeps centering when hidden) */}
      <div className="flex-1">
        {!isFirst && (
          <Button size="sm" variant="ghost" className="px-2 text-xs" onClick={previous}>
            ← Back
          </Button>
        )}
      </div>
      {/* Center: step counter */}
      <span className="text-xs text-muted-foreground">
        {stepIndex} / {TOUR_STEPS.length}
      </span>
      {/* Right: Skip + Next */}
      <div className="flex-1 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={skip}>
          Skip
        </Button>
        {showNextButton && (
          <Button size="sm" onClick={handleNext}>
            {isLast ? "Done" : timedOut ? "Continue anyway" : "Next"}
          </Button>
        )}
      </div>
    </div>
  );

  const content = (
    <PopoverContent
      side={step.placement}
      align="start"
      data-tour-popover="true"
      className="border-[var(--gold-primary)] [box-shadow:0_0_0_1px_var(--gold-primary),0_8px_40px_rgba(var(--gold-primary-rgb),0.18)]"
    >
      {/* key={step.id} re-mounts this div on every step → entrance animation fires each time */}
      <div key={step.id} className="space-y-3 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300">
        <h4 className="font-serif text-base font-semibold">{step.title}</h4>
        <p className="text-sm text-muted-foreground">{effectiveBody}</p>
        {tourFooter}
      </div>
    </PopoverContent>
  );

  // Safety-net fallback: target element not present on current page (user
  // manually navigated somewhere weird, or a target hasn't mounted yet).
  // Shows the step center-screen — deliberately NOT bottom-right because
  // that corner is reserved for toast notifications. Next still works —
  // it either auto-navigates via handleNext (Fix 1) or advances step state.
  if (!anchorEl) {
    return (
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[min(22rem,90vw)] rounded-lg bg-[var(--bg-floating-elevated,#1a1a1e)] backdrop-blur-sm p-4"
        style={{
          border: "1px solid var(--gold-primary)",
          boxShadow: "0 0 0 1px var(--gold-primary), 0 8px 40px rgba(var(--gold-primary-rgb), 0.18)",
        }}
      >
        {/* key on inner div so it remounts (replaying the animation) on every step change */}
        <div key={step.id} className="space-y-3 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300">
          <h4 className="font-serif text-base font-semibold">{step.title}</h4>
          <p className="text-sm text-muted-foreground">{effectiveBody}</p>
          {tourFooter}
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
