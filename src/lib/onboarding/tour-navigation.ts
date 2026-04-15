import { TOUR_STEPS, type TourStepId, type TourStep } from "./tour-steps";

// Base advance — returns the structurally-next step or null at terminus.
export function nextTourStep(current: TourStepId): TourStepId | null {
  const i = TOUR_STEPS.findIndex((s) => s.id === current);
  if (i === -1 || i === TOUR_STEPS.length - 1) return null;
  return TOUR_STEPS[i + 1].id;
}

// Advance-with-skip: from `current`, finds the FIRST subsequent step whose
// targetSelector is present on the page. Returns null at terminus or if no
// remaining step has a present target. TourProvider MUST call this on every
// Next click (not plain nextTourStep), so missing targets are skipped rather
// than leaving a blank popover hanging over nothing. Also used on initial mount.
export function nextPresentTourStep(
  current: TourStepId,
  isSelectorPresent: (selector: string) => boolean
): TourStepId | null {
  const i = TOUR_STEPS.findIndex((s) => s.id === current);
  if (i === -1 || i === TOUR_STEPS.length - 1) return null;
  for (let j = i + 1; j < TOUR_STEPS.length; j++) {
    if (isSelectorPresent(TOUR_STEPS[j].targetSelector)) return TOUR_STEPS[j].id;
  }
  return null;
}

export function previousTourStep(current: TourStepId): TourStepId | null {
  const i = TOUR_STEPS.findIndex((s) => s.id === current);
  if (i <= 0) return null;
  return TOUR_STEPS[i - 1].id;
}

export function findFirstPresentStep(
  steps: readonly TourStep[],
  isSelectorPresent: (selector: string) => boolean
): TourStepId | null {
  for (const s of steps) {
    if (isSelectorPresent(s.targetSelector)) return s.id;
  }
  return null;
}
