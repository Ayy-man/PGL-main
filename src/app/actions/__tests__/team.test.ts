// Phase 44 Plan 06 — Coverage for the D-13 reassign hook in removeTeamMember.
//
// The four tests in the main describe block prove, in order:
//   1. Happy path — lists.update + personas.update fire BEFORE users.delete +
//      auth.admin.deleteUser. Payload is { visibility: "team_shared",
//      created_by: <acting admin id> } scoped to .eq("tenant_id", tenantId)
//      and .eq("created_by", removedUserId).
//   2. If lists.update returns an error, the function short-circuits and
//      users.delete + auth.admin.deleteUser are NEVER called. Error envelope
//      contains "Failed to reassign lists".
//   3. Same for personas.update (after lists.update has succeeded).
//   4. D-14 regression — attempting to remove the only active tenant_admin
//      short-circuits with the pre-existing "last tenant admin" error and the
//      reassign hook never fires.
//
// The mock helpers build a per-`.from(table)` call recorder that captures the
// operation kind (select/update/delete), the payload (for update/insert), and
// the chain of .eq(col, val) calls, then terminates with a thenable that
// resolves to a configured response. The dispatch table lets each test
// configure per-table behavior (success/error) independently.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// 1. Mock surface — must be declared BEFORE the SUT is imported.
// ---------------------------------------------------------------------------

// Ordered record of every admin.from(table).<op>(...).<eq chain>() call the
// SUT makes during a single test. Tests reset this in beforeEach.
interface AdminCall {
  table: string;
  op: string;
  payload?: unknown;
  filters: Array<[string, unknown]>;
}

const adminCalls: AdminCall[] = [];

/**
 * Per-table response configuration, keyed by op.
 * - update/insert: { error: ... | null }
 * - delete: { error: ... | null }
 * - select.single: { data: ..., error: ... | null }
 * - select.count: { count: number | null, error: ... | null }
 */
type ResponseMap = {
  update?: { error: { message: string } | null };
  insert?: { error: { message: string } | null };
  delete?: { error: { message: string } | null };
  singleSelect?: { data: unknown; error: { message: string } | null };
  countSelect?: { count: number | null; error: { message: string } | null };
};

/**
 * Build a chainable mock that records a single operation invocation under the
 * shared `adminCalls` array and terminates with configured responses.
 *
 * Supports:
 *   .update(payload).eq(col, val).eq(col, val)  → thenable
 *   .insert(payload).eq(...)                    → thenable
 *   .delete().eq(...)                           → thenable
 *   .select().eq(...).single()                  → resolves with singleSelect
 *   .select("id", { count: "exact", head: true }).eq().eq().eq() → resolves with countSelect
 *   .select(...).eq(...)                        → resolves with { data: [], error: null }
 */
function makeChainable(table: string, responses: ResponseMap) {
  const current: AdminCall = { table, op: "", payload: undefined, filters: [] };

  // Shared terminal thenable used by update/insert/delete when the chain ends
  // in .eq(...). We push the call record lazily so Array#toMatchObject assertions
  // see the final filter chain.
  const finalizeMutation = (): Promise<{ error: { message: string } | null }> => {
    adminCalls.push({ ...current, filters: [...current.filters] });
    const resp = responses[current.op as "update" | "insert" | "delete"];
    return Promise.resolve(resp ?? { error: null });
  };

  // Shared terminal for count-style selects (.select(..., { count: "exact", head: true }))
  const finalizeCountSelect = (): Promise<{
    count: number | null;
    data: unknown;
    error: { message: string } | null;
  }> => {
    adminCalls.push({ ...current, filters: [...current.filters] });
    const resp = responses.countSelect;
    return Promise.resolve({
      count: resp?.count ?? null,
      data: null,
      error: resp?.error ?? null,
    });
  };

  // Shared terminal for .select(...).eq(...).single()
  const finalizeSingleSelect = (): Promise<{
    data: unknown;
    error: { message: string } | null;
  }> => {
    adminCalls.push({ ...current, filters: [...current.filters] });
    const resp = responses.singleSelect;
    return Promise.resolve({
      data: resp?.data ?? null,
      error: resp?.error ?? null,
    });
  };

  // Chain with eq() that can terminate a mutation OR continue before .single()
  const makeEqChain = (
    onTerminal: () => Promise<unknown>,
    onSingle?: () => Promise<unknown>
  ): {
    eq: (...args: unknown[]) => unknown;
    single?: () => Promise<unknown>;
    then: (onfulfilled: (v: unknown) => unknown) => Promise<unknown>;
  } => {
    const obj: {
      eq: (...args: unknown[]) => unknown;
      single?: () => Promise<unknown>;
      then: (onfulfilled: (v: unknown) => unknown) => Promise<unknown>;
    } = {
      eq(col: unknown, val: unknown) {
        current.filters.push([String(col), val]);
        return makeEqChain(onTerminal, onSingle);
      },
      // Allow `.eq(...).then(...)` usage — terminal thenable.
      then(onfulfilled) {
        return onTerminal().then(onfulfilled);
      },
    };
    if (onSingle) {
      obj.single = onSingle;
    }
    return obj;
  };

  const chain = {
    update(payload: unknown) {
      current.op = "update";
      current.payload = payload;
      return makeEqChain(finalizeMutation);
    },
    insert(payload: unknown) {
      current.op = "insert";
      current.payload = payload;
      return makeEqChain(finalizeMutation);
    },
    delete() {
      current.op = "delete";
      return makeEqChain(finalizeMutation);
    },
    select(_cols?: unknown, options?: { count?: string; head?: boolean }) {
      // If the caller passes { count: "exact", head: true }, this is a count query.
      if (options && options.count === "exact") {
        current.op = "select.count";
        return makeEqChain(finalizeCountSelect);
      }
      // Otherwise it's a row-fetch that may end in .single().
      current.op = "select";
      return makeEqChain(finalizeSingleSelect, finalizeSingleSelect);
    },
  };

  return chain;
}

// Mocks for admin client + session client -------------------------------------
const mockAdminFrom = vi.fn();
const mockAdminDeleteUser = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
    auth: { admin: { deleteUser: mockAdminDeleteUser } },
  }),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
  }),
}));

// Silence logActivity (pre-deletion audit log — writes to activity_log table).
vi.mock("@/lib/activity-logger", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

// Silence onboarding-state observer.
vi.mock("../onboarding-state", () => ({
  updateOnboardingState: vi.fn().mockResolvedValue(undefined),
}));

// Silence revalidatePath.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// ---------------------------------------------------------------------------
// 2. Import SUT after mocks are wired.
// ---------------------------------------------------------------------------
import { removeTeamMember } from "../team";

// ---------------------------------------------------------------------------
// 3. Fixtures
// ---------------------------------------------------------------------------
const ACTING_ADMIN_ID = "admin-uuid";
const TARGET_USER_ID = "target-uuid";
const TENANT_ID = "tenant-uuid";
const ORG_ID = "org-slug";

function authedAsAdmin() {
  mockGetUser.mockResolvedValue({
    data: {
      user: {
        id: ACTING_ADMIN_ID,
        email: "admin@example.com",
        app_metadata: { tenant_id: TENANT_ID, role: "tenant_admin" },
      },
    },
    error: null,
  });
}

// Default dispatch table:
//   - users SELECT (by id).single() → return target-user row (agent role)
//   - users DELETE (.eq("id", ...)) → success
//   - lists UPDATE → success
//   - personas UPDATE → success
function installHappyPathDispatch(opts?: {
  targetRole?: string;
  listsError?: { message: string };
  personasError?: { message: string };
  tenantAdminCount?: number;
}) {
  const targetRole = opts?.targetRole ?? "agent";

  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "users") {
      // We need one surface that supports BOTH:
      //   admin.from("users").select("role, tenant_id, email, full_name").eq("id", userId).single()
      //   admin.from("users").select("id", { count: "exact", head: true }).eq(...).eq(...).eq(...)
      //   admin.from("users").delete().eq("id", userId)
      return makeChainable("users", {
        singleSelect: {
          data: {
            role: targetRole,
            tenant_id: TENANT_ID,
            email: "target@example.com",
            full_name: "Target User",
          },
          error: null,
        },
        countSelect: {
          count: opts?.tenantAdminCount ?? 5,
          error: null,
        },
        delete: { error: null },
      });
    }
    if (table === "lists") {
      return makeChainable("lists", {
        update: opts?.listsError ? { error: opts.listsError } : { error: null },
      });
    }
    if (table === "personas") {
      return makeChainable("personas", {
        update: opts?.personasError
          ? { error: opts.personasError }
          : { error: null },
      });
    }
    // Unhandled table — return a chain that resolves to {data: null, error: null}
    return makeChainable(table, {
      update: { error: null },
      delete: { error: null },
      singleSelect: { data: null, error: null },
    });
  });
}

// ---------------------------------------------------------------------------
// 4. Tests
// ---------------------------------------------------------------------------

describe("removeTeamMember — D-13 reassign hook (Phase 44)", () => {
  beforeEach(() => {
    adminCalls.length = 0;
    mockAdminFrom.mockReset();
    mockAdminDeleteUser.mockReset();
    mockGetUser.mockReset();
    authedAsAdmin();
    mockAdminDeleteUser.mockResolvedValue({ data: null, error: null });
  });

  it("reassigns lists + personas BEFORE deleting the user (ordering + payload)", async () => {
    installHappyPathDispatch();

    const result = await removeTeamMember(TARGET_USER_ID, ORG_ID);

    expect(result).toEqual({ success: true });

    // Order assertion — reassign must land BEFORE users.delete.
    const ops = adminCalls.map((c) => `${c.table}.${c.op}`);
    const listsIdx = ops.indexOf("lists.update");
    const personasIdx = ops.indexOf("personas.update");
    const deleteIdx = ops.indexOf("users.delete");

    expect(listsIdx).toBeGreaterThanOrEqual(0);
    expect(personasIdx).toBeGreaterThan(listsIdx);
    expect(deleteIdx).toBeGreaterThan(personasIdx);

    // Payload assertion — reassign to the acting admin + flip to team_shared.
    const listsCall = adminCalls.find(
      (c) => c.table === "lists" && c.op === "update"
    );
    expect(listsCall?.payload).toMatchObject({
      visibility: "team_shared",
      created_by: ACTING_ADMIN_ID,
    });
    expect(listsCall?.filters).toContainEqual(["tenant_id", TENANT_ID]);
    expect(listsCall?.filters).toContainEqual(["created_by", TARGET_USER_ID]);

    const personasCall = adminCalls.find(
      (c) => c.table === "personas" && c.op === "update"
    );
    expect(personasCall?.payload).toMatchObject({
      visibility: "team_shared",
      created_by: ACTING_ADMIN_ID,
    });
    expect(personasCall?.filters).toContainEqual(["tenant_id", TENANT_ID]);
    expect(personasCall?.filters).toContainEqual(["created_by", TARGET_USER_ID]);

    // auth.admin.deleteUser MUST be called (happy path completes).
    expect(mockAdminDeleteUser).toHaveBeenCalledWith(TARGET_USER_ID);
  });

  it("short-circuits with 'Failed to reassign lists' error if list reassign fails", async () => {
    installHappyPathDispatch({ listsError: { message: "boom-lists" } });

    const result = await removeTeamMember(TARGET_USER_ID, ORG_ID);

    expect(result).toMatchObject({
      error: expect.stringContaining("Failed to reassign lists"),
    });

    // Critical invariants — personas.update, users.delete, auth.deleteUser
    // must NEVER run when lists.update errors.
    const ops = adminCalls.map((c) => `${c.table}.${c.op}`);
    expect(ops).not.toContain("personas.update");
    expect(ops).not.toContain("users.delete");
    expect(mockAdminDeleteUser).not.toHaveBeenCalled();
  });

  it("short-circuits with 'Failed to reassign personas' error if persona reassign fails", async () => {
    installHappyPathDispatch({ personasError: { message: "boom-personas" } });

    const result = await removeTeamMember(TARGET_USER_ID, ORG_ID);

    expect(result).toMatchObject({
      error: expect.stringContaining("Failed to reassign personas"),
    });

    // users.delete + auth.deleteUser must NEVER run when personas.update errors.
    const ops = adminCalls.map((c) => `${c.table}.${c.op}`);
    expect(ops).not.toContain("users.delete");
    expect(mockAdminDeleteUser).not.toHaveBeenCalled();

    // But lists.update WAS called (successful in this scenario).
    expect(ops).toContain("lists.update");
  });

  it("last-tenant-admin block fires BEFORE reassign runs (D-14 regression)", async () => {
    // Target is the only active tenant_admin — count = 1.
    installHappyPathDispatch({
      targetRole: "tenant_admin",
      tenantAdminCount: 1,
    });

    const result = await removeTeamMember(TARGET_USER_ID, ORG_ID);

    // D-14 guard surfaces the literal "Cannot remove the last tenant admin"
    // message. We loose-match on "last admin|cannot remove" per plan spec so
    // a future wording tweak doesn't regress this test.
    expect(result).toEqual(
      expect.objectContaining({
        error: expect.stringMatching(/last admin|cannot remove/i),
      })
    );

    // The critical invariant — reassign + delete MUST NOT run when the
    // last-admin block fires. This proves the ordering: last-admin guard
    // (D-14) → reassign (D-13) → delete.
    const ops = adminCalls.map((c) => `${c.table}.${c.op}`);
    expect(ops).not.toContain("lists.update");
    expect(ops).not.toContain("personas.update");
    expect(ops).not.toContain("users.delete");
    expect(mockAdminDeleteUser).not.toHaveBeenCalled();
  });
});
