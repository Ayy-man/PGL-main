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
vi.mock("@/lib/personas/queries", () => ({
  createPersona: (...a: unknown[]) => mockCreatePersona(...a),
  updatePersona: (...a: unknown[]) => mockUpdatePersona(...a),
  deletePersona: (...a: unknown[]) => mockDeletePersona(...a),
}));

// --- Mock next/cache (revalidatePath is a no-op in tests) ---
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// --- Import SUT after mocks ---
import {
  createPersonaAction,
  updatePersonaAction,
  deletePersonaAction,
} from "../actions";

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

function fdWithFilters(name = "My Persona") {
  const fd = new FormData();
  fd.set("name", name);
  fd.set("titles", "CEO|CFO"); // satisfies "at least one filter"
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
