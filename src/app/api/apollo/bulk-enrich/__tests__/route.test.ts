import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mockGetUser },
  }),
}));

const mockBulkEnrich = vi.fn();
vi.mock("@/lib/circuit-breaker/apollo-breaker", () => ({
  bulkEnrichPeople: (...a: unknown[]) => mockBulkEnrich(...a),
}));

vi.mock("@/lib/platform-config", () => ({
  isApolloMockMode: async () => true,
}));

const mockWithRateLimit = vi.fn();
vi.mock("@/lib/rate-limit/middleware", () => ({
  withRateLimit: (...a: unknown[]) => mockWithRateLimit(...a),
  rateLimitResponse: (res: { reason: string }) =>
    new Response(JSON.stringify({ error: res.reason }), { status: 429 }),
}));
vi.mock("@/lib/rate-limit/limiters", () => ({ apolloRateLimiter: {} }));
vi.mock("@/lib/error-logger", () => ({ logError: vi.fn() }));

import { POST } from "../route";

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/apollo/bulk-enrich", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
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
const NO_TENANT = {
  data: {
    user: { id: "u1", email: "a@b.com", app_metadata: { role: "agent" } },
  },
  error: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockWithRateLimit.mockResolvedValue({ success: true });
});

describe("POST /api/apollo/bulk-enrich — role guard", () => {
  it("assistant → 403 Forbidden, bulkEnrich never called", async () => {
    mockGetUser.mockResolvedValue(authedUser("assistant"));
    const res = await POST(makeRequest({ apolloIds: ["a1"] }));
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({
      error: "Forbidden",
      message: "Your role does not permit this action",
    });
    expect(mockBulkEnrich).not.toHaveBeenCalled();
    expect(mockWithRateLimit).not.toHaveBeenCalled();
  });

  it("agent → 200 (mock mode) with people array", async () => {
    mockGetUser.mockResolvedValue(authedUser("agent"));
    const res = await POST(
      makeRequest({
        apolloIds: ["a1", "a2"],
        previews: [{ id: "a1" }, { id: "a2" }],
      })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.people).toHaveLength(2);
    expect(body.mock).toBe(true);
  });

  it("no session → 401 Unauthorized", async () => {
    mockGetUser.mockResolvedValue(NO_SESSION);
    const res = await POST(makeRequest({ apolloIds: ["a1"] }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("no tenantId → 401 Unauthorized (existing behavior preserved)", async () => {
    mockGetUser.mockResolvedValue(NO_TENANT);
    const res = await POST(makeRequest({ apolloIds: ["a1"] }));
    expect(res.status).toBe(401);
  });

  it("tenant_admin and super_admin → 200 (hierarchy sanity)", async () => {
    for (const role of ["tenant_admin", "super_admin"] as const) {
      mockGetUser.mockResolvedValue(authedUser(role));
      const res = await POST(
        makeRequest({
          apolloIds: ["a1"],
          previews: [{ id: "a1" }],
        })
      );
      expect(res.status).toBe(200);
    }
  });
});
