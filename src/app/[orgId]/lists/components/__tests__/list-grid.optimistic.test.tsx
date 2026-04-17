import { describe, it, expect } from "vitest";
import {
  listsOptimisticReducer,
  type OptimisticList,
  type OptimisticListsAction,
} from "../list-grid";
import type { List } from "@/lib/lists/types";
import type { Visibility } from "@/types/visibility";

/**
 * Tests for the pure `listsOptimisticReducer` state machine.
 *
 * Phase 40 CONTEXT.md locks the test strategy to pure helpers only — no RTL,
 * no jsdom, no `render()`. The reducer owns the full create/delete optimistic
 * lifecycle (CREATE_PENDING, CREATE_CONFIRMED, CREATE_FAILED, DELETE_PENDING,
 * DELETE_UNDO, DELETE_CONFIRMED, DELETE_FAILED). UI wiring in `list-grid.tsx`
 * and `create-list-dialog.tsx` is covered by the plan 40-08 manual UAT.
 */

const TENANT_ID = "tenant-abc";
const NOW = "2026-04-15T12:00:00.000Z";

function makeList(overrides: Partial<List> = {}): List {
  return {
    id: `list-${Math.random().toString(36).slice(2, 8)}`,
    tenant_id: TENANT_ID,
    name: "Untitled",
    description: null,
    member_count: 0,
    // Plan 44-04: default fixtures to a real user id so tests exercise the
    // creator-threading path end-to-end. Callers that want the null-creator
    // edge case can still override via the `overrides` bag.
    visibility: "team_shared",
    created_by: "user-abc",
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makePending(
  tempId: string,
  name: string,
  visibility: Visibility = "team_shared",
  createdBy: string | null = "user-abc",
  description: string | null = null,
): OptimisticList {
  return {
    id: tempId,
    tenant_id: TENANT_ID,
    name,
    description,
    member_count: 0,
    // Plan 44-04: visibility + createdBy are now threaded from the dialog's
    // segmented control (Pitfall 5). Tests can assert that the reducer
    // preserves both through CREATE_PENDING / CREATE_CONFIRMED.
    visibility,
    created_by: createdBy,
    created_at: NOW,
    updated_at: NOW,
    __pending: true,
  };
}

describe("listsOptimisticReducer — CREATE_PENDING", () => {
  it("prepends the pending list to the head of the grid", () => {
    const existing = makeList({ id: "list-1", name: "Existing" });
    const state: OptimisticList[] = [existing];
    const tempList = makePending("temp-xyz", "Brand new list");

    const action: OptimisticListsAction = { type: "CREATE_PENDING", tempList };
    const next = listsOptimisticReducer(state, action);

    expect(next).toHaveLength(2);
    expect(next[0]).toBe(tempList);
    expect(next[0].__pending).toBe(true);
    expect(next[1]).toBe(existing);
  });

  it("does not mutate the previous state array", () => {
    const existing = makeList({ id: "list-1" });
    const state: OptimisticList[] = [existing];
    const snapshot = [...state];
    const tempList = makePending("temp-xyz", "Brand new list");

    listsOptimisticReducer(state, { type: "CREATE_PENDING", tempList });

    expect(state).toEqual(snapshot);
  });

  // Plan 44-04 (Pitfall 5): The optimistic temp list now carries the
  // visibility selected in the CreateListDialog segmented control. The
  // reducer must preserve that visibility through CREATE_PENDING so the
  // grid badge renders correctly pre-confirm — NOT flash 'team_shared'
  // for a personal list until the server round-trip completes.
  it("preserves visibility=personal from makeTempList through CREATE_PENDING (Pitfall 5)", () => {
    const state: OptimisticList[] = [];
    const tempList = makePending("temp-xyz", "My private list", "personal");

    const next = listsOptimisticReducer(state, { type: "CREATE_PENDING", tempList });

    expect(next).toHaveLength(1);
    expect(next[0].visibility).toBe("personal");
    expect(next[0].created_by).toBe("user-abc");
    expect(next[0].__pending).toBe(true);
  });

  it("preserves visibility=team_shared (default) through CREATE_PENDING", () => {
    const state: OptimisticList[] = [];
    const tempList = makePending("temp-abc", "Shared list");

    const next = listsOptimisticReducer(state, { type: "CREATE_PENDING", tempList });

    expect(next).toHaveLength(1);
    expect(next[0].visibility).toBe("team_shared");
    expect(next[0].__pending).toBe(true);
  });
});

describe("listsOptimisticReducer — CREATE_CONFIRMED", () => {
  it("replaces the pending list with the real list by tempId (preserves position)", () => {
    const a = makeList({ id: "list-a", name: "A" });
    const pending = makePending("temp-xyz", "Brand new list");
    const b = makeList({ id: "list-b", name: "B" });
    const state: OptimisticList[] = [a, pending, b];

    const realList = makeList({ id: "list-real", name: "Brand new list" });
    const next = listsOptimisticReducer(state, {
      type: "CREATE_CONFIRMED",
      tempId: "temp-xyz",
      realList,
    });

    expect(next).toHaveLength(3);
    expect(next[0]).toBe(a);
    expect(next[1]).toEqual({ ...realList });
    // Confirmed lists have no __pending flag set.
    expect((next[1] as OptimisticList).__pending).toBeUndefined();
    expect(next[2]).toBe(b);
  });

  it("is a no-op if the tempId no longer exists (reconcile race)", () => {
    const existing = makeList({ id: "list-1", name: "Existing" });
    const state: OptimisticList[] = [existing];

    const realList = makeList({ id: "list-real", name: "Brand new list" });
    const next = listsOptimisticReducer(state, {
      type: "CREATE_CONFIRMED",
      tempId: "temp-gone",
      realList,
    });

    expect(next).toEqual(state);
  });
});

describe("listsOptimisticReducer — CREATE_FAILED", () => {
  it("removes the pending list by tempId", () => {
    const a = makeList({ id: "list-a" });
    const pending = makePending("temp-xyz", "Brand new list");
    const b = makeList({ id: "list-b" });
    const state: OptimisticList[] = [a, pending, b];

    const next = listsOptimisticReducer(state, {
      type: "CREATE_FAILED",
      tempId: "temp-xyz",
    });

    expect(next).toHaveLength(2);
    expect(next.find((l) => l.id === "temp-xyz")).toBeUndefined();
    expect(next).toEqual([a, b]);
  });

  it("is a no-op if the tempId is not present", () => {
    const existing = makeList({ id: "list-1" });
    const state: OptimisticList[] = [existing];

    const next = listsOptimisticReducer(state, {
      type: "CREATE_FAILED",
      tempId: "temp-gone",
    });

    expect(next).toEqual(state);
  });
});

describe("listsOptimisticReducer — DELETE_PENDING", () => {
  it("removes the list from the grid immediately", () => {
    const a = makeList({ id: "list-a" });
    const b = makeList({ id: "list-b" });
    const c = makeList({ id: "list-c" });
    const state: OptimisticList[] = [a, b, c];

    const next = listsOptimisticReducer(state, {
      type: "DELETE_PENDING",
      listId: "list-b",
    });

    expect(next).toHaveLength(2);
    expect(next).toEqual([a, c]);
  });

  it("is a no-op when the id is not present", () => {
    const a = makeList({ id: "list-a" });
    const state: OptimisticList[] = [a];

    const next = listsOptimisticReducer(state, {
      type: "DELETE_PENDING",
      listId: "list-missing",
    });

    expect(next).toEqual(state);
  });
});

describe("listsOptimisticReducer — DELETE_UNDO", () => {
  it("restores the snapshot exactly (original position preserved)", () => {
    const a = makeList({ id: "list-a" });
    const b = makeList({ id: "list-b" });
    const c = makeList({ id: "list-c" });
    const previous: OptimisticList[] = [a, b, c];

    // State after DELETE_PENDING removed b.
    const afterDelete: OptimisticList[] = [a, c];

    const next = listsOptimisticReducer(afterDelete, {
      type: "DELETE_UNDO",
      previousLists: previous,
    });

    expect(next).toEqual([a, b, c]);
  });

  it("does not restore if the list is already present (undo after race with server push)", () => {
    const a = makeList({ id: "list-a" });
    const b = makeList({ id: "list-b" });
    const previous: OptimisticList[] = [a, b];

    // Both lists are present — undo is redundant.
    const currentState: OptimisticList[] = [a, b];

    const next = listsOptimisticReducer(currentState, {
      type: "DELETE_UNDO",
      previousLists: previous,
    });

    expect(next).toBe(currentState);
  });
});

describe("listsOptimisticReducer — DELETE_CONFIRMED", () => {
  it("is a no-op because DELETE_PENDING already removed the row", () => {
    const a = makeList({ id: "list-a" });
    const state: OptimisticList[] = [a];

    const next = listsOptimisticReducer(state, {
      type: "DELETE_CONFIRMED",
      listId: "list-b",
    });

    expect(next).toBe(state);
  });
});

describe("listsOptimisticReducer — DELETE_FAILED", () => {
  it("restores the previousLists snapshot on server failure", () => {
    const a = makeList({ id: "list-a" });
    const b = makeList({ id: "list-b" });
    const previous: OptimisticList[] = [a, b];
    const afterDelete: OptimisticList[] = [a];

    const next = listsOptimisticReducer(afterDelete, {
      type: "DELETE_FAILED",
      previousLists: previous,
    });

    expect(next).toEqual([a, b]);
  });
});

describe("listsOptimisticReducer — full lifecycle integration", () => {
  it("create success: PENDING -> CONFIRMED replaces temp with real row at same position", () => {
    const existing = makeList({ id: "list-existing", name: "Existing" });
    let state: OptimisticList[] = [existing];

    const tempList = makePending("temp-abc", "New VIP prospects");
    state = listsOptimisticReducer(state, { type: "CREATE_PENDING", tempList });
    expect(state[0].id).toBe("temp-abc");
    expect((state[0] as OptimisticList).__pending).toBe(true);

    const realList = makeList({ id: "list-real", name: "New VIP prospects" });
    state = listsOptimisticReducer(state, {
      type: "CREATE_CONFIRMED",
      tempId: "temp-abc",
      realList,
    });
    expect(state[0].id).toBe("list-real");
    expect((state[0] as OptimisticList).__pending).toBeUndefined();
    expect(state[1]).toBe(existing);
  });

  it("create failure: PENDING -> FAILED removes temp, grid reverts to previous", () => {
    const existing = makeList({ id: "list-existing" });
    let state: OptimisticList[] = [existing];

    const tempList = makePending("temp-abc", "Bad list");
    state = listsOptimisticReducer(state, { type: "CREATE_PENDING", tempList });
    state = listsOptimisticReducer(state, {
      type: "CREATE_FAILED",
      tempId: "temp-abc",
    });

    expect(state).toEqual([existing]);
  });

  it("delete success: PENDING -> CONFIRMED (no-op) leaves grid without the row", () => {
    const a = makeList({ id: "list-a" });
    const b = makeList({ id: "list-b" });
    let state: OptimisticList[] = [a, b];

    state = listsOptimisticReducer(state, { type: "DELETE_PENDING", listId: "list-b" });
    state = listsOptimisticReducer(state, { type: "DELETE_CONFIRMED", listId: "list-b" });

    expect(state).toEqual([a]);
  });

  it("delete failure: PENDING -> FAILED restores the snapshot and row reappears", () => {
    const a = makeList({ id: "list-a" });
    const b = makeList({ id: "list-b" });
    const previous: OptimisticList[] = [a, b];
    let state: OptimisticList[] = [a, b];

    state = listsOptimisticReducer(state, { type: "DELETE_PENDING", listId: "list-b" });
    state = listsOptimisticReducer(state, {
      type: "DELETE_FAILED",
      previousLists: previous,
    });

    expect(state).toEqual([a, b]);
  });

  it("delete undo: PENDING -> UNDO before server confirm restores the row", () => {
    const a = makeList({ id: "list-a" });
    const b = makeList({ id: "list-b" });
    const previous: OptimisticList[] = [a, b];
    let state: OptimisticList[] = [a, b];

    state = listsOptimisticReducer(state, { type: "DELETE_PENDING", listId: "list-b" });
    expect(state).toEqual([a]);

    state = listsOptimisticReducer(state, {
      type: "DELETE_UNDO",
      previousLists: previous,
    });
    expect(state).toEqual([a, b]);
  });
});
