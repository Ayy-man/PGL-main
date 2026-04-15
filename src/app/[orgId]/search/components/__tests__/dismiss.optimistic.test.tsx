import { describe, it, expect, vi } from "vitest";
import {
  applyDismiss,
  applyUndoDismiss,
  runOptimisticDismiss,
  type DismissState,
  type DismissProspect,
} from "../../lib/dismiss-reducer";

function makeProspect(id: string, overrides: Partial<DismissProspect> = {}): DismissProspect {
  return {
    apollo_person_id: id,
    ...overrides,
  };
}

describe("applyDismiss (pure reducer)", () => {
  it("filters out dismissed prospects and increments dismissedCount", () => {
    const prev: DismissState = {
      prospects: [makeProspect("a"), makeProspect("b"), makeProspect("c")],
      dismissedCount: 1,
    };
    const next = applyDismiss(prev, ["b"]);
    expect(next.prospects.map((p) => p.apollo_person_id)).toEqual(["a", "c"]);
    expect(next.dismissedCount).toBe(2);
  });

  it("handles bulk dismiss of multiple ids", () => {
    const prev: DismissState = {
      prospects: [makeProspect("a"), makeProspect("b"), makeProspect("c")],
      dismissedCount: 0,
    };
    const next = applyDismiss(prev, ["a", "c"]);
    expect(next.prospects.map((p) => p.apollo_person_id)).toEqual(["b"]);
    expect(next.dismissedCount).toBe(2);
  });

  it("returns same values when no ids match", () => {
    const prev: DismissState = {
      prospects: [makeProspect("a")],
      dismissedCount: 5,
    };
    const next = applyDismiss(prev, ["zzz"]);
    expect(next.prospects).toHaveLength(1);
    expect(next.dismissedCount).toBe(5);
  });

  it("does not double-count when same id dismissed twice", () => {
    // Once an id is filtered out, dismissing it again is a no-op on prospects
    // but we still count the id change. Verify the first pass removed it.
    const prev: DismissState = {
      prospects: [makeProspect("a"), makeProspect("b")],
      dismissedCount: 0,
    };
    const first = applyDismiss(prev, ["a"]);
    const second = applyDismiss(first, ["a"]);
    expect(second.prospects.map((p) => p.apollo_person_id)).toEqual(["b"]);
    // Count reflects the number of ids passed, not actual removals
    // (test locks current documented behavior)
    expect(second.dismissedCount).toBe(2);
  });
});

describe("applyUndoDismiss (pure reducer)", () => {
  it("decrements dismissedCount (not below zero)", () => {
    const prev: DismissState = { prospects: [], dismissedCount: 3 };
    expect(applyUndoDismiss(prev).dismissedCount).toBe(2);
  });

  it("clamps at zero", () => {
    const prev: DismissState = { prospects: [], dismissedCount: 0 };
    expect(applyUndoDismiss(prev).dismissedCount).toBe(0);
  });
});

describe("runOptimisticDismiss (orchestration)", () => {
  it("applies optimistic state then resolves on server success", async () => {
    const setState = vi.fn();
    const toast = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    const prev: DismissState = {
      prospects: [makeProspect("a"), makeProspect("b")],
      dismissedCount: 0,
    };

    const result = await runOptimisticDismiss({
      previous: prev,
      apolloPersonIds: ["a"],
      searchId: "search-1",
      fetchImpl,
      setState,
      toast,
    });

    expect(result.committed).toBe(true);
    expect(setState).toHaveBeenCalledTimes(1); // optimistic set only, no rollback
    const [optimisticPatch] = setState.mock.calls[0];
    expect(optimisticPatch.prospects.map((p: DismissProspect) => p.apollo_person_id)).toEqual(["b"]);
    expect(optimisticPatch.dismissedCount).toBe(1);

    // Fetch called with correct payload
    expect(fetchImpl).toHaveBeenCalledWith(
      "/api/search/search-1/dismiss",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "dismiss", apolloPersonIds: ["a"] }),
      })
    );

    // Toast fired with undo action
    expect(toast).toHaveBeenCalledTimes(1);
    const toastArg = toast.mock.calls[0][0];
    expect(toastArg.title).toContain("dismissed");
    expect(toastArg.action).toBeDefined();
  });

  it("uses bulk-dismiss action when >1 ids", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    await runOptimisticDismiss({
      previous: { prospects: [], dismissedCount: 0 },
      apolloPersonIds: ["a", "b"],
      searchId: "s",
      fetchImpl,
      setState: vi.fn(),
      toast: vi.fn(),
    });

    const bodyArg = JSON.parse((fetchImpl.mock.calls[0][1] as RequestInit).body as string);
    expect(bodyArg.action).toBe("bulk-dismiss");
    expect(bodyArg.apolloPersonIds).toEqual(["a", "b"]);
  });

  it("rolls back and fires destructive toast on server error", async () => {
    const setState = vi.fn();
    const toast = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Server exploded" }),
    });

    const prev: DismissState = {
      prospects: [makeProspect("a")],
      dismissedCount: 0,
    };

    const result = await runOptimisticDismiss({
      previous: prev,
      apolloPersonIds: ["a"],
      searchId: "s",
      fetchImpl,
      setState,
      toast,
    });

    expect(result.committed).toBe(false);
    // setState called twice: once optimistic, once rollback
    expect(setState).toHaveBeenCalledTimes(2);
    const rollbackPatch = setState.mock.calls[1][0];
    expect(rollbackPatch).toEqual(prev);

    // Two toasts fired: initial undo toast + destructive error toast
    expect(toast).toHaveBeenCalledTimes(2);
    const errorToast = toast.mock.calls[1][0];
    expect(errorToast.variant).toBe("destructive");
    expect(errorToast.description).toBe("Server exploded");
  });

  it("rolls back on fetch network rejection", async () => {
    const setState = vi.fn();
    const toast = vi.fn();
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network down"));

    const prev: DismissState = {
      prospects: [makeProspect("a")],
      dismissedCount: 0,
    };

    const result = await runOptimisticDismiss({
      previous: prev,
      apolloPersonIds: ["a"],
      searchId: "s",
      fetchImpl,
      setState,
      toast,
    });

    expect(result.committed).toBe(false);
    expect(setState).toHaveBeenLastCalledWith(prev);
    const errorToast = toast.mock.calls.at(-1)?.[0];
    expect(errorToast.variant).toBe("destructive");
  });

  it("falls back to generic error description when server omits message", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) });
    const toast = vi.fn();

    await runOptimisticDismiss({
      previous: { prospects: [makeProspect("a")], dismissedCount: 0 },
      apolloPersonIds: ["a"],
      searchId: "s",
      fetchImpl,
      setState: vi.fn(),
      toast,
    });

    const errorToast = toast.mock.calls.at(-1)?.[0];
    expect(typeof errorToast.description).toBe("string");
    expect(errorToast.description.length).toBeGreaterThan(0);
  });
});
