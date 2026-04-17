import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock @/lib/auth/rbac ---
// Default: requireRole resolves as 'agent' (success path).
// Individual tests override via mockRequireRole.mockRejectedValue / mockResolvedValueOnce.
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

// --- Mock @/lib/personas/queries (the DB layer) ---
const mockCreatePersona = vi.fn();
const mockUpdatePersona = vi.fn();
const mockDeletePersona = vi.fn();
const mockUpdatePersonaVisibility = vi.fn();   // NEW — Phase 44
vi.mock("@/lib/personas/queries", () => ({
  createPersona: (...a: unknown[]) => mockCreatePersona(...a),
  updatePersona: (...a: unknown[]) => mockUpdatePersona(...a),
  deletePersona: (...a: unknown[]) => mockDeletePersona(...a),
  updatePersonaVisibility: (...a: unknown[]) => mockUpdatePersonaVisibility(...a),
}));

// --- Mock next/cache (revalidatePath is a no-op in tests) ---
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// --- Mock @/app/actions/onboarding-state (Phase 41-04 checklist observer) ---
// Server Action would drag in next/headers under `environment: 'node'` — stub it.
vi.mock("@/app/actions/onboarding-state", () => ({
  updateOnboardingState: vi.fn().mockResolvedValue({ ok: true }),
}));

// --- Import SUT after mocks ---
import {
  createPersonaAction,
  updatePersonaAction,
  deletePersonaAction,
  updatePersonaVisibilityAction,
} from "../actions";

import type { Visibility } from "@/types/visibility";

// Helper: an object shaped like NEXT_REDIRECT (what redirect() throws).
class RedirectError extends Error {
  digest = "NEXT_REDIRECT;replace;/tenant-x;307";
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

function fdWithFilters(name = "My Persona", visibility?: Visibility | string) {
  const fd = new FormData();
  fd.set("name", name);
  fd.set("titles", "CEO|CFO"); // satisfies "at least one filter"
  if (visibility !== undefined) {
    fd.set("visibility", visibility);
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue(AUTHED_USER);
  mockRequireRole.mockResolvedValue(SESSION_USER);
});

describe("personas/actions — role guard", () => {
  describe("createPersonaAction", () => {
    it("agent → success, calls createPersona", async () => {
      mockCreatePersona.mockResolvedValue({ id: "P1", name: "My Persona" });
      const result = await createPersonaAction(fdWithFilters());
      expect(result).toEqual({ id: "P1", name: "My Persona" });
      expect(mockRequireRole).toHaveBeenCalledWith("agent");
      expect(mockCreatePersona).toHaveBeenCalledOnce();
    });

    it("assistant → rejects, DB never touched", async () => {
      mockRequireRole.mockRejectedValue(new RedirectError());
      await expect(createPersonaAction(fdWithFilters())).rejects.toMatchObject({
        digest: expect.stringContaining("NEXT_REDIRECT"),
      });
      expect(mockCreatePersona).not.toHaveBeenCalled();
    });

    it("no session → throws 'Not authenticated'", async () => {
      mockGetUser.mockResolvedValue(NO_SESSION);
      await expect(createPersonaAction(fdWithFilters())).rejects.toThrow(
        "Not authenticated"
      );
      expect(mockRequireRole).not.toHaveBeenCalled();
      expect(mockCreatePersona).not.toHaveBeenCalled();
    });
  });

  describe("updatePersonaAction", () => {
    it("agent → success, calls updatePersona", async () => {
      mockUpdatePersona.mockResolvedValue({ id: "P1", name: "Updated" });
      const result = await updatePersonaAction("P1", fdWithFilters("Updated"));
      expect(result).toEqual({ id: "P1", name: "Updated" });
      expect(mockRequireRole).toHaveBeenCalledWith("agent");
      expect(mockUpdatePersona).toHaveBeenCalledOnce();
    });

    it("assistant → rejects, DB never touched", async () => {
      mockRequireRole.mockRejectedValue(new RedirectError());
      await expect(updatePersonaAction("P1", fdWithFilters())).rejects.toMatchObject({
        digest: expect.stringContaining("NEXT_REDIRECT"),
      });
      expect(mockUpdatePersona).not.toHaveBeenCalled();
    });

    it("no session → throws 'Not authenticated'", async () => {
      mockGetUser.mockResolvedValue(NO_SESSION);
      await expect(updatePersonaAction("P1", fdWithFilters())).rejects.toThrow(
        "Not authenticated"
      );
      expect(mockRequireRole).not.toHaveBeenCalled();
      expect(mockUpdatePersona).not.toHaveBeenCalled();
    });
  });

  describe("deletePersonaAction", () => {
    it("agent → success, calls deletePersona", async () => {
      mockDeletePersona.mockResolvedValue(undefined);
      await deletePersonaAction("P1");
      expect(mockRequireRole).toHaveBeenCalledWith("agent");
      expect(mockDeletePersona).toHaveBeenCalledWith("P1", "tenant-x");
    });

    it("assistant → rejects, DB never touched", async () => {
      mockRequireRole.mockRejectedValue(new RedirectError());
      await expect(deletePersonaAction("P1")).rejects.toMatchObject({
        digest: expect.stringContaining("NEXT_REDIRECT"),
      });
      expect(mockDeletePersona).not.toHaveBeenCalled();
    });

    it("no session → throws 'Not authenticated'", async () => {
      mockGetUser.mockResolvedValue(NO_SESSION);
      await expect(deletePersonaAction("P1")).rejects.toThrow(
        "Not authenticated"
      );
      expect(mockRequireRole).not.toHaveBeenCalled();
      expect(mockDeletePersona).not.toHaveBeenCalled();
    });
  });

  describe("hierarchy sanity", () => {
    it("tenant_admin and super_admin both pass the guard", async () => {
      mockCreatePersona.mockResolvedValue({ id: "P1" });
      for (const role of ["tenant_admin", "super_admin"] as const) {
        mockRequireRole.mockResolvedValueOnce({
          id: "u",
          email: "a@b.com",
          role,
          tenantId: "tenant-x",
          fullName: "a@b.com",
        });
        const result = await createPersonaAction(fdWithFilters());
        expect(result).toEqual({ id: "P1" });
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Phase 44 — Visibility round-trip coverage
// ---------------------------------------------------------------------------

describe("createPersonaAction — visibility (Phase 44)", () => {
  it("passes personal visibility through to createPersona when formData specifies", async () => {
    mockCreatePersona.mockResolvedValue({ id: "P1", visibility: "personal" });

    const result = await createPersonaAction(fdWithFilters("X", "personal"));

    expect(result).toEqual({ id: "P1", visibility: "personal" });
    expect(mockCreatePersona).toHaveBeenCalledWith(
      "tenant-x",
      "user-123",
      expect.objectContaining({ visibility: "personal" })
    );
  });

  it("defaults to team_shared when visibility missing from formData", async () => {
    mockCreatePersona.mockResolvedValue({ id: "P1", visibility: "team_shared" });

    const result = await createPersonaAction(fdWithFilters("X"));

    expect(result).toEqual({ id: "P1", visibility: "team_shared" });
    expect(mockCreatePersona).toHaveBeenCalledWith(
      "tenant-x",
      "user-123",
      expect.objectContaining({ visibility: "team_shared" })
    );
  });

  it("rejects invalid visibility value without calling createPersona", async () => {
    await expect(createPersonaAction(fdWithFilters("X", "garbage"))).rejects.toThrow(
      "Invalid visibility value"
    );
    expect(mockCreatePersona).not.toHaveBeenCalled();
  });

  it("accepts team_shared explicitly from formData", async () => {
    mockCreatePersona.mockResolvedValue({ id: "P1", visibility: "team_shared" });

    const result = await createPersonaAction(fdWithFilters("X", "team_shared"));

    expect(result).toEqual({ id: "P1", visibility: "team_shared" });
    expect(mockCreatePersona).toHaveBeenCalledWith(
      "tenant-x",
      "user-123",
      expect.objectContaining({ visibility: "team_shared" })
    );
  });
});

describe("updatePersonaAction — visibility (Phase 44)", () => {
  it("merges visibility into UpdatePersonaInput when formData specifies", async () => {
    mockUpdatePersona.mockResolvedValue({ id: "P1", visibility: "personal" });

    await updatePersonaAction("P1", fdWithFilters("Updated", "personal"));

    expect(mockUpdatePersona).toHaveBeenCalledWith(
      "P1",
      "tenant-x",
      expect.objectContaining({ visibility: "personal" })
    );
  });

  it("omits visibility from UpdatePersonaInput when missing (partial-update semantics)", async () => {
    mockUpdatePersona.mockResolvedValue({ id: "P1" });

    await updatePersonaAction("P1", fdWithFilters("Updated"));

    // The updates object should NOT have a visibility key when formData omits it.
    const callArgs = mockUpdatePersona.mock.calls[0];
    expect(callArgs[0]).toBe("P1");
    expect(callArgs[1]).toBe("tenant-x");
    expect(callArgs[2]).not.toHaveProperty("visibility");
  });

  it("rejects invalid visibility without calling updatePersona", async () => {
    await expect(
      updatePersonaAction("P1", fdWithFilters("Updated", "garbage"))
    ).rejects.toThrow("Invalid visibility value");
    expect(mockUpdatePersona).not.toHaveBeenCalled();
  });
});

describe("updatePersonaVisibilityAction — Phase 44", () => {
  it("calls updatePersonaVisibility query with (personaId, tenantId, visibility) on happy path", async () => {
    mockUpdatePersonaVisibility.mockResolvedValue(undefined);

    const result = await updatePersonaVisibilityAction("p-1", "personal");

    expect(result).toEqual({ success: true });
    expect(mockRequireRole).toHaveBeenCalledWith("agent");
    expect(mockUpdatePersonaVisibility).toHaveBeenCalledWith(
      "p-1",
      "tenant-x",
      "personal"
    );
  });

  it("accepts team_shared on happy path", async () => {
    mockUpdatePersonaVisibility.mockResolvedValue(undefined);

    const result = await updatePersonaVisibilityAction("p-1", "team_shared");

    expect(result).toEqual({ success: true });
    expect(mockUpdatePersonaVisibility).toHaveBeenCalledWith(
      "p-1",
      "tenant-x",
      "team_shared"
    );
  });

  it("rejects invalid visibility without calling query", async () => {
    const result = await updatePersonaVisibilityAction("p-1", "garbage" as never);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Invalid visibility");
    }
    expect(mockUpdatePersonaVisibility).not.toHaveBeenCalled();
  });

  it("returns error when unauthenticated, DB never touched", async () => {
    mockGetUser.mockResolvedValue(NO_SESSION);

    const result = await updatePersonaVisibilityAction("p-1", "personal");

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockUpdatePersonaVisibility).not.toHaveBeenCalled();
    expect(mockRequireRole).not.toHaveBeenCalled();
  });

  it("returns error when role guard rejects (assistant), DB never touched", async () => {
    // RedirectError in this file mirrors next/navigation redirect() —
    // thrown object has .digest but empty .message (see class at top).
    // The action catches the throw, returns { success: false }, and the
    // security-critical invariant is that the DB is never touched.
    mockRequireRole.mockRejectedValue(new RedirectError());

    const result = await updatePersonaVisibilityAction("p-1", "personal");

    expect(result.success).toBe(false);
    expect(mockUpdatePersonaVisibility).not.toHaveBeenCalled();
  });

  it("surfaces query-layer error when RLS rejects (silent 0-row or thrown)", async () => {
    mockUpdatePersonaVisibility.mockRejectedValue(
      new Error("Failed to update persona visibility: permission denied")
    );

    const result = await updatePersonaVisibilityAction("p-1", "personal");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("permission denied");
    }
  });
});
