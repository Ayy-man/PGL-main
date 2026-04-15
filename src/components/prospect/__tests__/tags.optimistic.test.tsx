import { describe, it, expect, vi } from "vitest";
import {
  computeTagDiff,
  applyTagDiff,
} from "../lib/tags-reducer";

describe("computeTagDiff (pure)", () => {
  it("detects added and removed tags", () => {
    const diff = computeTagDiff(["a", "b"], ["b", "c"]);
    expect(diff.added).toEqual(["c"]);
    expect(diff.removed).toEqual(["a"]);
  });

  it("returns empty arrays when tag sets match", () => {
    const diff = computeTagDiff(["a", "b"], ["a", "b"]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it("handles entirely new tag set", () => {
    const diff = computeTagDiff([], ["a", "b"]);
    expect(diff.added).toEqual(["a", "b"]);
    expect(diff.removed).toEqual([]);
  });

  it("handles full removal", () => {
    const diff = computeTagDiff(["a", "b"], []);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual(["a", "b"]);
  });

  it("is order-insensitive for membership, order-preserving for output", () => {
    const diff = computeTagDiff(["z", "a"], ["a", "z", "m"]);
    expect(diff.added).toEqual(["m"]);
    expect(diff.removed).toEqual([]);
  });
});

describe("applyTagDiff (orchestration)", () => {
  it("POSTs added tags and DELETEs removed tags with correct bodies", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const onAddFail = vi.fn();
    const onRemoveFail = vi.fn();

    await applyTagDiff({
      prospectId: "p1",
      added: ["foo"],
      removed: ["bar"],
      fetchImpl,
      onAddFail,
      onRemoveFail,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [addCall, removeCall] = fetchImpl.mock.calls;
    expect(addCall[0]).toBe("/api/prospects/p1/tags");
    expect((addCall[1] as RequestInit).method).toBe("POST");
    expect(JSON.parse((addCall[1] as RequestInit).body as string)).toEqual({ tag: "foo" });

    expect(removeCall[0]).toBe("/api/prospects/p1/tags");
    expect((removeCall[1] as RequestInit).method).toBe("DELETE");
    expect(JSON.parse((removeCall[1] as RequestInit).body as string)).toEqual({ tag: "bar" });

    expect(onAddFail).not.toHaveBeenCalled();
    expect(onRemoveFail).not.toHaveBeenCalled();
  });

  it("fires onAddFail with tag + server error when POST fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Tag too long" }),
    });
    const onAddFail = vi.fn();
    const onRemoveFail = vi.fn();

    await applyTagDiff({
      prospectId: "p1",
      added: ["foo"],
      removed: [],
      fetchImpl,
      onAddFail,
      onRemoveFail,
    });

    expect(onAddFail).toHaveBeenCalledTimes(1);
    expect(onAddFail).toHaveBeenCalledWith("foo", "Tag too long");
    expect(onRemoveFail).not.toHaveBeenCalled();
  });

  it("fires onRemoveFail with tag + server error when DELETE fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Not allowed" }),
    });
    const onAddFail = vi.fn();
    const onRemoveFail = vi.fn();

    await applyTagDiff({
      prospectId: "p1",
      added: [],
      removed: ["bar"],
      fetchImpl,
      onAddFail,
      onRemoveFail,
    });

    expect(onRemoveFail).toHaveBeenCalledWith("bar", "Not allowed");
  });

  it("uses generic message when server error is missing", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    const onAddFail = vi.fn();

    await applyTagDiff({
      prospectId: "p1",
      added: ["foo"],
      removed: [],
      fetchImpl,
      onAddFail,
      onRemoveFail: vi.fn(),
    });

    const [, errorMessage] = onAddFail.mock.calls[0];
    expect(typeof errorMessage).toBe("string");
    expect(errorMessage.length).toBeGreaterThan(0);
  });

  it("fires onAddFail with fallback message on fetch rejection", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("network"));
    const onAddFail = vi.fn();

    await applyTagDiff({
      prospectId: "p1",
      added: ["foo"],
      removed: [],
      fetchImpl,
      onAddFail,
      onRemoveFail: vi.fn(),
    });

    expect(onAddFail).toHaveBeenCalledWith("foo", "network");
  });

  it("processes both added and removed sequentially and fires callbacks independently", async () => {
    // First call (POST foo) fails, second call (DELETE bar) succeeds
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "bad" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const onAddFail = vi.fn();
    const onRemoveFail = vi.fn();

    await applyTagDiff({
      prospectId: "p1",
      added: ["foo"],
      removed: ["bar"],
      fetchImpl,
      onAddFail,
      onRemoveFail,
    });

    expect(onAddFail).toHaveBeenCalledWith("foo", "bad");
    expect(onRemoveFail).not.toHaveBeenCalled();
  });
});
