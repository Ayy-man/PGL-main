import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  subscribeTourEvent,
  emitTourEvent,
  __resetTourEventBusForTests,
  __listenerCountForTests,
} from "../tour-event-bus";

beforeEach(() => {
  __resetTourEventBusForTests();
});

describe("subscribeTourEvent", () => {
  it("invokes the handler on emit", () => {
    const handler = vi.fn();
    subscribeTourEvent("search_submitted", handler);
    emitTourEvent("search_submitted");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("passes payload to handler", () => {
    const handler = vi.fn();
    subscribeTourEvent<{ prospectId: string }>("list_added", handler);
    emitTourEvent("list_added", { prospectId: "p-123" });
    expect(handler).toHaveBeenCalledWith({ prospectId: "p-123" });
  });

  it("returns an unsubscribe function that detaches the handler", () => {
    const handler = vi.fn();
    const unsub = subscribeTourEvent("persona_created", handler);
    unsub();
    emitTourEvent("persona_created");
    expect(handler).not.toHaveBeenCalled();
  });

  it("tracks listener count per event", () => {
    expect(__listenerCountForTests("search_submitted")).toBe(0);
    const unsub = subscribeTourEvent("search_submitted", () => {});
    expect(__listenerCountForTests("search_submitted")).toBe(1);
    unsub();
    expect(__listenerCountForTests("search_submitted")).toBe(0);
  });
});

describe("emitTourEvent", () => {
  it("invokes multiple listeners in subscription order", () => {
    const calls: number[] = [];
    subscribeTourEvent("enrichment_complete", () => calls.push(1));
    subscribeTourEvent("enrichment_complete", () => calls.push(2));
    subscribeTourEvent("enrichment_complete", () => calls.push(3));
    emitTourEvent("enrichment_complete");
    expect(calls).toEqual([1, 2, 3]);
  });

  it("is a no-op when no listeners are subscribed", () => {
    expect(() => emitTourEvent("search_submitted")).not.toThrow();
  });

  it("does not cross-fire to different events", () => {
    const searchHandler = vi.fn();
    const listHandler = vi.fn();
    subscribeTourEvent("search_submitted", searchHandler);
    subscribeTourEvent("list_added", listHandler);
    emitTourEvent("search_submitted");
    expect(searchHandler).toHaveBeenCalledOnce();
    expect(listHandler).not.toHaveBeenCalled();
  });

  it("isolates a throwing listener — other listeners still fire", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const good = vi.fn();
    subscribeTourEvent("search_submitted", () => {
      throw new Error("boom");
    });
    subscribeTourEvent("search_submitted", good);
    emitTourEvent("search_submitted");
    expect(good).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("allows a handler to unsubscribe itself during emission without skipping peers", () => {
    const log: string[] = [];
    const unsubSelf = subscribeTourEvent("persona_created", () => {
      log.push("first");
      unsubSelf();
    });
    subscribeTourEvent("persona_created", () => log.push("second"));
    emitTourEvent("persona_created");
    // Both fire on this emission because iteration is over a snapshot.
    expect(log).toEqual(["first", "second"]);
    // After first emission, only the second listener remains.
    log.length = 0;
    emitTourEvent("persona_created");
    expect(log).toEqual(["second"]);
  });
});

describe("leak prevention", () => {
  it("cleans up the event's bucket when last listener unsubs", () => {
    const unsub = subscribeTourEvent("search_submitted", () => {});
    expect(__listenerCountForTests("search_submitted")).toBe(1);
    unsub();
    expect(__listenerCountForTests("search_submitted")).toBe(0);
  });

  it("two subscriptions + two unsubscribes leaves zero listeners", () => {
    const a = subscribeTourEvent("list_added", () => {});
    const b = subscribeTourEvent("list_added", () => {});
    expect(__listenerCountForTests("list_added")).toBe(2);
    a();
    expect(__listenerCountForTests("list_added")).toBe(1);
    b();
    expect(__listenerCountForTests("list_added")).toBe(0);
  });

  it("unsubscribing the same handler twice is idempotent", () => {
    const unsub = subscribeTourEvent("enrichment_complete", () => {});
    unsub();
    unsub();
    expect(__listenerCountForTests("enrichment_complete")).toBe(0);
  });
});
