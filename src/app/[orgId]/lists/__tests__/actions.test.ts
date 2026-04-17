import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be declared before the module under test is imported.
// Pattern mirrors src/inngest/functions/__tests__/enrich-prospect.test.ts.
// ---------------------------------------------------------------------------

// --- Mock @/lib/auth/rbac ---
// Default: requireRole resolves as 'agent' (success path). Individual tests
// override via mockRequireRole.mockRejectedValue / mockResolvedValueOnce.
const mockRequireRole = vi.fn();
vi.mock("@/lib/auth/rbac", () => ({
  requireRole: (role: string) => mockRequireRole(role),
}));

// --- Mock @/lib/supabase/server ---
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
  }),
}));

// --- Mock @/lib/lists/queries (the DB layer) ---
const mockCreateList = vi.fn();
const mockDeleteList = vi.fn();
const mockUpdateListVisibility = vi.fn();   // NEW — Phase 44
const mockUpdateMemberStatus = vi.fn();
const mockUpdateMemberNotes = vi.fn();
const mockRemoveFromList = vi.fn();
const mockAddProspectToList = vi.fn();
vi.mock("@/lib/lists/queries", () => ({
  createList: (...a: unknown[]) => mockCreateList(...a),
  deleteList: (...a: unknown[]) => mockDeleteList(...a),
  updateListVisibility: (...a: unknown[]) => mockUpdateListVisibility(...a),
  updateMemberStatus: (...a: unknown[]) => mockUpdateMemberStatus(...a),
  updateMemberNotes: (...a: unknown[]) => mockUpdateMemberNotes(...a),
  removeFromList: (...a: unknown[]) => mockRemoveFromList(...a),
  addProspectToList: (...a: unknown[]) => mockAddProspectToList(...a),
}));

// --- Mock next/cache (revalidatePath is a no-op in tests) ---
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// --- Import SUT after mocks ---
import {
  createListAction,
  deleteListAction,
  updateListVisibilityAction,
  updateMemberStatusAction,
  updateMemberNotesAction,
  removeFromListAction,
  addToListAction,
} from "../actions";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Helper: an object shaped like what Next.js's redirect() throws.
// The real redirect() throws an Error whose `digest` starts with
// "NEXT_REDIRECT;…"; we carry the same token in `.message` so that the
// action's try/catch — which serializes via `error.message` — surfaces
// the NEXT_REDIRECT signal in the returned envelope. That lets us assert
// both the security invariant (DB never called) AND that the guard fired.
class RedirectError extends Error {
  digest = "NEXT_REDIRECT;replace;/tenant-x;307";
  constructor() {
    super("NEXT_REDIRECT;replace;/tenant-x;307");
    this.name = "RedirectError";
  }
}

const AUTHED_USER = {
  data: {
    user: {
      id: "user-123",
      email: "a@b.com",
      app_metadata: { tenant_id: "tenant-x", role: "agent" },
    },
  },
  error: null,
};
const NO_SESSION = { data: { user: null }, error: null };
const SESSION_USER = {
  id: "user-123",
  email: "a@b.com",
  role: "agent" as const,
  tenantId: "tenant-x",
  fullName: "a@b.com",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue(AUTHED_USER);
  mockRequireRole.mockResolvedValue(SESSION_USER);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("lists/actions — role guard", () => {
  describe("createListAction", () => {
    it("agent → success", async () => {
      mockCreateList.mockResolvedValue({ id: "L1", name: "x" });
      const fd = new FormData();
      fd.set("name", "x");

      const result = await createListAction(fd);

      expect(result).toEqual({ success: true, list: { id: "L1", name: "x" } });
      expect(mockRequireRole).toHaveBeenCalledWith("agent");
      expect(mockCreateList).toHaveBeenCalledOnce();
    });

    it("assistant → guard rejects, DB never touched", async () => {
      mockRequireRole.mockRejectedValue(new RedirectError());
      const fd = new FormData();
      fd.set("name", "x");

      const result = await createListAction(fd);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("NEXT_REDIRECT");
      }
      // Security-relevant invariant: guard fires BEFORE any DB write.
      expect(mockCreateList).not.toHaveBeenCalled();
    });

    it("no session → { success: false, error: 'Not authenticated' }", async () => {
      mockGetUser.mockResolvedValue(NO_SESSION);
      const fd = new FormData();
      fd.set("name", "x");

      const result = await createListAction(fd);

      expect(result).toEqual({ success: false, error: "Not authenticated" });
      expect(mockRequireRole).not.toHaveBeenCalled();
      expect(mockCreateList).not.toHaveBeenCalled();
    });
  });

  describe("deleteListAction", () => {
    it("agent → success", async () => {
      mockDeleteList.mockResolvedValue(undefined);

      const result = await deleteListAction("list-1");

      expect(result).toEqual({ success: true });
      expect(mockRequireRole).toHaveBeenCalledWith("agent");
      expect(mockDeleteList).toHaveBeenCalledWith("list-1", "tenant-x");
    });

    it("assistant → guard rejects, DB never touched", async () => {
      mockRequireRole.mockRejectedValue(new RedirectError());

      const result = await deleteListAction("list-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("NEXT_REDIRECT");
      }
      expect(mockDeleteList).not.toHaveBeenCalled();
    });

    it("no session → { success: false, error: 'Not authenticated' }", async () => {
      mockGetUser.mockResolvedValue(NO_SESSION);

      const result = await deleteListAction("list-1");

      expect(result).toEqual({ success: false, error: "Not authenticated" });
      expect(mockRequireRole).not.toHaveBeenCalled();
      expect(mockDeleteList).not.toHaveBeenCalled();
    });
  });

  describe("updateMemberStatusAction", () => {
    it("agent → success", async () => {
      mockUpdateMemberStatus.mockResolvedValue(undefined);

      const result = await updateMemberStatusAction("m-1", "contacted");

      expect(result).toEqual({ success: true });
      expect(mockRequireRole).toHaveBeenCalledWith("agent");
      expect(mockUpdateMemberStatus).toHaveBeenCalledWith(
        "m-1",
        "contacted",
        "tenant-x"
      );
    });

    it("assistant → guard rejects, DB never touched", async () => {
      mockRequireRole.mockRejectedValue(new RedirectError());

      const result = await updateMemberStatusAction("m-1", "contacted");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("NEXT_REDIRECT");
      }
      expect(mockUpdateMemberStatus).not.toHaveBeenCalled();
    });

    it("no session → { success: false, error: 'Not authenticated' }", async () => {
      mockGetUser.mockResolvedValue(NO_SESSION);

      const result = await updateMemberStatusAction("m-1", "contacted");

      expect(result).toEqual({ success: false, error: "Not authenticated" });
      expect(mockRequireRole).not.toHaveBeenCalled();
      expect(mockUpdateMemberStatus).not.toHaveBeenCalled();
    });
  });

  describe("updateMemberNotesAction", () => {
    it("agent → success", async () => {
      mockUpdateMemberNotes.mockResolvedValue(undefined);

      const result = await updateMemberNotesAction("m-1", "hello");

      expect(result).toEqual({ success: true });
      expect(mockRequireRole).toHaveBeenCalledWith("agent");
      expect(mockUpdateMemberNotes).toHaveBeenCalledWith(
        "m-1",
        "hello",
        "tenant-x"
      );
    });

    it("assistant → guard rejects, DB never touched", async () => {
      mockRequireRole.mockRejectedValue(new RedirectError());

      const result = await updateMemberNotesAction("m-1", "hello");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("NEXT_REDIRECT");
      }
      expect(mockUpdateMemberNotes).not.toHaveBeenCalled();
    });

    it("no session → { success: false, error: 'Not authenticated' }", async () => {
      mockGetUser.mockResolvedValue(NO_SESSION);

      const result = await updateMemberNotesAction("m-1", "hello");

      expect(result).toEqual({ success: false, error: "Not authenticated" });
      expect(mockRequireRole).not.toHaveBeenCalled();
      expect(mockUpdateMemberNotes).not.toHaveBeenCalled();
    });
  });

  describe("removeFromListAction", () => {
    it("agent → success", async () => {
      mockRemoveFromList.mockResolvedValue(undefined);

      const result = await removeFromListAction("m-1");

      expect(result).toEqual({ success: true });
      expect(mockRequireRole).toHaveBeenCalledWith("agent");
      expect(mockRemoveFromList).toHaveBeenCalledWith("m-1", "tenant-x");
    });

    it("assistant → guard rejects, DB never touched", async () => {
      mockRequireRole.mockRejectedValue(new RedirectError());

      const result = await removeFromListAction("m-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("NEXT_REDIRECT");
      }
      expect(mockRemoveFromList).not.toHaveBeenCalled();
    });

    it("no session → { success: false, error: 'Not authenticated' }", async () => {
      mockGetUser.mockResolvedValue(NO_SESSION);

      const result = await removeFromListAction("m-1");

      expect(result).toEqual({ success: false, error: "Not authenticated" });
      expect(mockRequireRole).not.toHaveBeenCalled();
      expect(mockRemoveFromList).not.toHaveBeenCalled();
    });
  });

  describe("addToListAction", () => {
    it("agent → success", async () => {
      mockAddProspectToList.mockResolvedValue(undefined);

      const result = await addToListAction("list-1", "prospect-1");

      expect(result).toEqual({ success: true });
      expect(mockRequireRole).toHaveBeenCalledWith("agent");
      expect(mockAddProspectToList).toHaveBeenCalledWith(
        "list-1",
        "prospect-1",
        "tenant-x",
        "user-123"
      );
    });

    it("assistant → guard rejects, DB never touched", async () => {
      mockRequireRole.mockRejectedValue(new RedirectError());

      const result = await addToListAction("list-1", "prospect-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("NEXT_REDIRECT");
      }
      expect(mockAddProspectToList).not.toHaveBeenCalled();
    });

    it("no session → { success: false, error: 'Not authenticated' }", async () => {
      mockGetUser.mockResolvedValue(NO_SESSION);

      const result = await addToListAction("list-1", "prospect-1");

      expect(result).toEqual({ success: false, error: "Not authenticated" });
      expect(mockRequireRole).not.toHaveBeenCalled();
      expect(mockAddProspectToList).not.toHaveBeenCalled();
    });
  });

  describe("hierarchy sanity", () => {
    it("tenant_admin and super_admin both pass the guard", async () => {
      mockCreateList.mockResolvedValue({ id: "L1" });

      for (const role of ["tenant_admin", "super_admin"] as const) {
        mockRequireRole.mockResolvedValueOnce({ ...SESSION_USER, role });
        const fd = new FormData();
        fd.set("name", "x");

        const result = await createListAction(fd);

        expect(result.success).toBe(true);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 44 — Visibility round-trip coverage
// ---------------------------------------------------------------------------

describe("createListAction — visibility (Phase 44)", () => {
  it("creates list with personal visibility when formData specifies 'personal'", async () => {
    mockCreateList.mockResolvedValue({
      id: "L1",
      tenant_id: "tenant-x",
      name: "My private",
      description: null,
      member_count: 0,
      visibility: "personal",
      created_by: "user-123",
      created_at: "2026-04-17T00:00:00.000Z",
      updated_at: "2026-04-17T00:00:00.000Z",
    });
    const fd = new FormData();
    fd.set("name", "My private");
    fd.set("visibility", "personal");

    const result = await createListAction(fd);

    expect(result.success).toBe(true);
    expect(mockCreateList).toHaveBeenCalledWith(
      "tenant-x",
      "user-123",
      expect.objectContaining({ name: "My private", visibility: "personal" })
    );
  });

  it("defaults to team_shared when visibility missing from formData", async () => {
    mockCreateList.mockResolvedValue({
      id: "L1",
      tenant_id: "tenant-x",
      name: "Default",
      description: null,
      member_count: 0,
      visibility: "team_shared",
      created_by: "user-123",
      created_at: "2026-04-17T00:00:00.000Z",
      updated_at: "2026-04-17T00:00:00.000Z",
    });
    const fd = new FormData();
    fd.set("name", "Default");

    const result = await createListAction(fd);

    expect(result.success).toBe(true);
    expect(mockCreateList).toHaveBeenCalledWith(
      "tenant-x",
      "user-123",
      expect.objectContaining({ visibility: "team_shared" })
    );
  });

  it("rejects garbage visibility value and never calls createList", async () => {
    const fd = new FormData();
    fd.set("name", "x");
    fd.set("visibility", "garbage");

    const result = await createListAction(fd);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid visibility");
    }
    expect(mockCreateList).not.toHaveBeenCalled();
  });

  it("accepts team_shared explicitly from formData", async () => {
    mockCreateList.mockResolvedValue({
      id: "L1",
      tenant_id: "tenant-x",
      name: "Team list",
      description: null,
      member_count: 0,
      visibility: "team_shared",
      created_by: "user-123",
      created_at: "2026-04-17T00:00:00.000Z",
      updated_at: "2026-04-17T00:00:00.000Z",
    });
    const fd = new FormData();
    fd.set("name", "Team list");
    fd.set("visibility", "team_shared");

    const result = await createListAction(fd);

    expect(result.success).toBe(true);
    expect(mockCreateList).toHaveBeenCalledWith(
      "tenant-x",
      "user-123",
      expect.objectContaining({ visibility: "team_shared" })
    );
  });
});

describe("updateListVisibilityAction — Phase 44", () => {
  it("calls updateListVisibility query with (listId, tenantId, visibility) on happy path", async () => {
    mockUpdateListVisibility.mockResolvedValue(undefined);

    const result = await updateListVisibilityAction("list-1", "personal");

    expect(result).toEqual({ success: true });
    expect(mockRequireRole).toHaveBeenCalledWith("agent");
    expect(mockUpdateListVisibility).toHaveBeenCalledWith(
      "list-1",
      "tenant-x",
      "personal"
    );
  });

  it("accepts team_shared on happy path", async () => {
    mockUpdateListVisibility.mockResolvedValue(undefined);

    const result = await updateListVisibilityAction("list-1", "team_shared");

    expect(result).toEqual({ success: true });
    expect(mockUpdateListVisibility).toHaveBeenCalledWith(
      "list-1",
      "tenant-x",
      "team_shared"
    );
  });

  it("rejects invalid visibility value before calling query", async () => {
    const result = await updateListVisibilityAction("list-1", "garbage" as never);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid visibility");
    }
    expect(mockUpdateListVisibility).not.toHaveBeenCalled();
  });

  it("returns error when not authenticated", async () => {
    mockGetUser.mockResolvedValue(NO_SESSION);

    const result = await updateListVisibilityAction("list-1", "personal");

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockUpdateListVisibility).not.toHaveBeenCalled();
    expect(mockRequireRole).not.toHaveBeenCalled();
  });

  it("returns error when role guard rejects (assistant), DB never touched", async () => {
    mockRequireRole.mockRejectedValue(new RedirectError());

    const result = await updateListVisibilityAction("list-1", "personal");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("NEXT_REDIRECT");
    }
    expect(mockUpdateListVisibility).not.toHaveBeenCalled();
  });

  it("surfaces query-layer error when RLS rejects (silent 0-row or thrown)", async () => {
    mockUpdateListVisibility.mockRejectedValue(
      new Error("Failed to update list visibility: permission denied")
    );

    const result = await updateListVisibilityAction("list-1", "personal");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("permission denied");
    }
  });
});
