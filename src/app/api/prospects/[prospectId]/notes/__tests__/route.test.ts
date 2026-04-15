import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockUpdateSingle = vi.fn();
const mockFrom = vi.fn(() => ({
  update: vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockUpdateSingle,
        })),
      })),
    })),
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock("@/lib/activity-logger", () => ({
  logActivity: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/lib/activity", () => ({
  logProspectActivity: vi.fn(() => Promise.resolve()),
}));

import { PATCH } from "../route";
import { NextRequest } from "next/server";

function makeRequest(body: object): NextRequest {
  return new NextRequest("http://localhost/api/prospects/p1/notes", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeContext() {
  return { params: Promise.resolve({ prospectId: "p1" }) };
}

function authedUser(role: string) {
  return {
    data: {
      user: {
        id: "u1",
        email: "a@b.com",
        app_metadata: { tenant_id: "tenant-x", role },
      },
    },
    error: null,
  };
}
const NO_SESSION = { data: { user: null }, error: null };

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateSingle.mockResolvedValue({
    data: { id: "p1", notes: "ok" },
    error: null,
  });
});

describe("PATCH /api/prospects/[prospectId]/notes — role guard", () => {
  it("assistant → 403 Forbidden, update never called", async () => {
    mockGetUser.mockResolvedValue(authedUser("assistant"));
    const res = await PATCH(makeRequest({ notes: "x" }), makeContext());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({
      error: "Forbidden",
      message: "Your role does not permit this action",
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("agent → 200 { notes }", async () => {
    mockGetUser.mockResolvedValue(authedUser("agent"));
    const res = await PATCH(makeRequest({ notes: "ok" }), makeContext());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ notes: "ok" });
  });

  it("no session → 401 Unauthorized", async () => {
    mockGetUser.mockResolvedValue(NO_SESSION);
    const res = await PATCH(makeRequest({ notes: "x" }), makeContext());
    expect(res.status).toBe(401);
  });

  it("tenant_admin and super_admin → 200 (hierarchy sanity)", async () => {
    for (const role of ["tenant_admin", "super_admin"] as const) {
      mockGetUser.mockResolvedValue(authedUser(role));
      const res = await PATCH(makeRequest({ notes: "ok" }), makeContext());
      expect(res.status).toBe(200);
    }
  });
});
