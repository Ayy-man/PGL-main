import { describe, it, expect } from "vitest";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import {
  reduceProspectsEnrichedPayload,
  shouldApplyProspectUpdate,
  type ProspectsRow,
} from "../prospects-enriched-handler";

type TestMember = {
  prospect_id: string;
  enriched_at: string | null;
  enrichment_status: string | null;
  photo_url: string | null;
  title: string | null;
  full_name: string | null;
};

function makeRow(overrides: Partial<ProspectsRow> = {}): ProspectsRow {
  return {
    id: "prospect-1",
    tenant_id: "tenant-1",
    enriched_at: null,
    enrichment_status: null,
    photo_url: null,
    title: null,
    full_name: null,
    ...overrides,
  };
}

function makePayload(
  newRow: ProspectsRow,
  oldRow: Partial<ProspectsRow> = {}
): RealtimePostgresChangesPayload<ProspectsRow> {
  // supabase-js adds commit_timestamp/errors on actual events, but the reducer
  // under test only reads `new` and `old`, so we cast to avoid listing the
  // full runtime shape in every fixture.
  return {
    eventType: "UPDATE",
    new: newRow,
    old: oldRow,
    schema: "public",
    table: "prospects",
    commit_timestamp: new Date().toISOString(),
    errors: [],
  } as unknown as RealtimePostgresChangesPayload<ProspectsRow>;
}

function makeMember(overrides: Partial<TestMember> = {}): TestMember {
  return {
    prospect_id: "prospect-1",
    enriched_at: null,
    enrichment_status: null,
    photo_url: null,
    title: null,
    full_name: null,
    ...overrides,
  };
}

describe("shouldApplyProspectUpdate", () => {
  it("returns false for empty/missing new payload", () => {
    const empty = {
      eventType: "UPDATE",
      new: undefined as unknown as ProspectsRow,
      old: {},
      schema: "public",
      table: "prospects",
    } as unknown as RealtimePostgresChangesPayload<ProspectsRow>;
    expect(shouldApplyProspectUpdate(empty, new Set(["prospect-1"]))).toBe(false);
  });

  it("returns false when payload.new has no id", () => {
    const payload = makePayload(makeRow({ id: undefined as unknown as string }));
    expect(shouldApplyProspectUpdate(payload, new Set(["prospect-1"]))).toBe(false);
  });

  it("returns false when id is not in visibleIds", () => {
    const payload = makePayload(makeRow({ id: "prospect-off-screen" }));
    expect(shouldApplyProspectUpdate(payload, new Set(["prospect-1", "prospect-2"]))).toBe(false);
  });

  it("returns true when id is in visibleIds", () => {
    const payload = makePayload(makeRow({ id: "prospect-1" }));
    expect(shouldApplyProspectUpdate(payload, new Set(["prospect-1"]))).toBe(true);
  });
});

describe("reduceProspectsEnrichedPayload", () => {
  it("returns same reference when id not in visibleIds", () => {
    const members = [makeMember({ prospect_id: "prospect-1" })];
    const payload = makePayload(
      makeRow({ id: "prospect-off-screen", enriched_at: "2026-04-15T12:00:00Z" })
    );
    const result = reduceProspectsEnrichedPayload(payload, members, new Set(["prospect-1"]));
    expect(result).toBe(members);
  });

  it("returns same reference when no patchable fields changed", () => {
    const members = [
      makeMember({
        prospect_id: "prospect-1",
        enriched_at: "2026-04-15T12:00:00Z",
        enrichment_status: "complete",
        photo_url: "https://example.com/x.jpg",
        title: "CTO",
        full_name: "Ada Lovelace",
      }),
    ];
    const payload = makePayload(
      makeRow({
        id: "prospect-1",
        enriched_at: "2026-04-15T12:00:00Z",
        enrichment_status: "complete",
        photo_url: "https://example.com/x.jpg",
        title: "CTO",
        full_name: "Ada Lovelace",
      })
    );
    const result = reduceProspectsEnrichedPayload(payload, members, new Set(["prospect-1"]));
    expect(result).toBe(members);
  });

  it("returns same reference when prospect_id is not matched in currentMembers", () => {
    const members = [makeMember({ prospect_id: "different-member" })];
    const payload = makePayload(
      makeRow({ id: "prospect-1", enriched_at: "2026-04-15T12:00:00Z" })
    );
    const result = reduceProspectsEnrichedPayload(
      payload,
      members,
      new Set(["prospect-1", "different-member"])
    );
    expect(result).toBe(members);
  });

  it("returns new array with patched enriched_at (null → timestamp)", () => {
    const members = [
      makeMember({ prospect_id: "prospect-1", enriched_at: null }),
      makeMember({ prospect_id: "prospect-2" }),
    ];
    const payload = makePayload(
      makeRow({ id: "prospect-1", enriched_at: "2026-04-15T12:00:00Z" })
    );
    const result = reduceProspectsEnrichedPayload(
      payload,
      members,
      new Set(["prospect-1", "prospect-2"])
    );
    expect(result).not.toBe(members);
    expect(result[0].enriched_at).toBe("2026-04-15T12:00:00Z");
    // Unrelated member untouched (reference equality)
    expect(result[1]).toBe(members[1]);
  });

  it("patches multiple fields at once (photo_url + title)", () => {
    const members = [
      makeMember({
        prospect_id: "prospect-1",
        photo_url: null,
        title: null,
        enriched_at: null,
      }),
    ];
    const payload = makePayload(
      makeRow({
        id: "prospect-1",
        photo_url: "https://cdn.example.com/photo.jpg",
        title: "VP Engineering",
      })
    );
    const result = reduceProspectsEnrichedPayload(payload, members, new Set(["prospect-1"]));
    expect(result).not.toBe(members);
    expect(result[0].photo_url).toBe("https://cdn.example.com/photo.jpg");
    expect(result[0].title).toBe("VP Engineering");
    // enriched_at was null in payload too (no change), stays null
    expect(result[0].enriched_at).toBeNull();
  });

  it("patches enrichment_status and full_name", () => {
    const members = [
      makeMember({
        prospect_id: "prospect-1",
        enrichment_status: "pending",
        full_name: null,
      }),
    ];
    const payload = makePayload(
      makeRow({
        id: "prospect-1",
        enrichment_status: "complete",
        full_name: "Grace Hopper",
      })
    );
    const result = reduceProspectsEnrichedPayload(payload, members, new Set(["prospect-1"]));
    expect(result).not.toBe(members);
    expect(result[0].enrichment_status).toBe("complete");
    expect(result[0].full_name).toBe("Grace Hopper");
  });

  it("preserves non-patched keys on the matched member", () => {
    const members = [
      {
        prospect_id: "prospect-1",
        enriched_at: null,
        enrichment_status: null,
        photo_url: null,
        title: null,
        full_name: null,
        // Arbitrary unrelated keys the reducer must not strip:
        notes: "keep me",
        status: "new",
      } as TestMember & { notes: string; status: string },
    ];
    const payload = makePayload(
      makeRow({ id: "prospect-1", enriched_at: "2026-04-15T12:00:00Z" })
    );
    const result = reduceProspectsEnrichedPayload(payload, members, new Set(["prospect-1"]));
    expect(result).not.toBe(members);
    expect(result[0].notes).toBe("keep me");
    expect(result[0].status).toBe("new");
    expect(result[0].enriched_at).toBe("2026-04-15T12:00:00Z");
  });
});
