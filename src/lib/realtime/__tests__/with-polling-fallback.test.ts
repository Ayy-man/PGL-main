import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createFallbackController, type RealtimeStatus } from "../with-polling-fallback";

/**
 * Tests for the pure `createFallbackController` state machine.
 *
 * Phase 40 CONTEXT.md locks the test strategy to pure helpers only — no RTL,
 * no jsdom, no `render()`. The React hook (`useRealtimeWithFallback`) is a
 * thin wrapper that just forwards status events and cleanup; the observable
 * behaviour (CHANNEL_ERROR → poll, SUBSCRIBED → stop) lives in the controller
 * and is fully covered here.
 */
describe("createFallbackController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does NOT poll when the only status event is SUBSCRIBED", () => {
    const poll = vi.fn();
    const controller = createFallbackController({ poll, pollIntervalMs: 10_000 });

    controller.handleStatus("SUBSCRIBED");

    // Advance well past a poll interval to prove no tick fired.
    vi.advanceTimersByTime(30_000);
    expect(poll).not.toHaveBeenCalled();
    expect(controller.isPolling).toBe(false);

    controller.dispose();
  });

  it("starts polling every 10s on CHANNEL_ERROR", () => {
    const poll = vi.fn();
    const controller = createFallbackController({ poll, pollIntervalMs: 10_000 });

    controller.handleStatus("CHANNEL_ERROR");
    expect(controller.isPolling).toBe(true);
    expect(poll).not.toHaveBeenCalled(); // setInterval doesn't fire immediately

    vi.advanceTimersByTime(10_000);
    expect(poll).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10_000);
    expect(poll).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(10_000);
    expect(poll).toHaveBeenCalledTimes(3);

    controller.dispose();
  });

  it("starts polling on TIMED_OUT (same treatment as CHANNEL_ERROR)", () => {
    const poll = vi.fn();
    const controller = createFallbackController({ poll, pollIntervalMs: 10_000 });

    controller.handleStatus("TIMED_OUT");
    expect(controller.isPolling).toBe(true);

    vi.advanceTimersByTime(10_000);
    expect(poll).toHaveBeenCalledTimes(1);

    controller.dispose();
  });

  it("stops polling when status recovers to SUBSCRIBED after a prior error", () => {
    const poll = vi.fn();
    const controller = createFallbackController({ poll, pollIntervalMs: 10_000 });

    controller.handleStatus("CHANNEL_ERROR");
    vi.advanceTimersByTime(10_000);
    expect(poll).toHaveBeenCalledTimes(1);

    controller.handleStatus("SUBSCRIBED");
    expect(controller.isPolling).toBe(false);

    // Advance well past several intervals — no further poll calls.
    vi.advanceTimersByTime(60_000);
    expect(poll).toHaveBeenCalledTimes(1);

    controller.dispose();
  });

  it("handles reconnect churn: ERROR → SUBSCRIBED → ERROR restarts polling cleanly", () => {
    const poll = vi.fn();
    const controller = createFallbackController({ poll, pollIntervalMs: 10_000 });

    controller.handleStatus("CHANNEL_ERROR");
    vi.advanceTimersByTime(10_000);
    expect(poll).toHaveBeenCalledTimes(1);

    controller.handleStatus("SUBSCRIBED");
    vi.advanceTimersByTime(30_000);
    expect(poll).toHaveBeenCalledTimes(1); // no ticks while subscribed

    controller.handleStatus("CHANNEL_ERROR");
    vi.advanceTimersByTime(10_000);
    expect(poll).toHaveBeenCalledTimes(2);

    controller.dispose();
  });

  it("ignores CLOSED — treats it as a normal teardown signal, not a fallback trigger", () => {
    const poll = vi.fn();
    const controller = createFallbackController({ poll, pollIntervalMs: 10_000 });

    controller.handleStatus("CLOSED");
    expect(controller.isPolling).toBe(false);

    vi.advanceTimersByTime(30_000);
    expect(poll).not.toHaveBeenCalled();

    controller.dispose();
  });

  it("is idempotent: repeat CHANNEL_ERROR doesn't stack intervals", () => {
    const poll = vi.fn();
    const controller = createFallbackController({ poll, pollIntervalMs: 10_000 });

    controller.handleStatus("CHANNEL_ERROR");
    controller.handleStatus("CHANNEL_ERROR");
    controller.handleStatus("CHANNEL_ERROR");

    vi.advanceTimersByTime(10_000);
    // Still exactly 1 call per tick — stacking would produce 3.
    expect(poll).toHaveBeenCalledTimes(1);

    controller.dispose();
  });

  it("dispose() clears the interval and is safe to call twice", () => {
    const poll = vi.fn();
    const controller = createFallbackController({ poll, pollIntervalMs: 10_000 });

    controller.handleStatus("CHANNEL_ERROR");
    controller.dispose();
    controller.dispose(); // idempotent — must not throw

    vi.advanceTimersByTime(60_000);
    expect(poll).not.toHaveBeenCalled();
    expect(controller.isPolling).toBe(false);
  });

  it("respects a custom pollIntervalMs", () => {
    const poll = vi.fn();
    const controller = createFallbackController({ poll, pollIntervalMs: 5_000 });

    controller.handleStatus("CHANNEL_ERROR");

    vi.advanceTimersByTime(5_000);
    expect(poll).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5_000);
    expect(poll).toHaveBeenCalledTimes(2);

    controller.dispose();
  });

  it("keeps the interval alive when poll() rejects (no unhandled rejection takedown)", async () => {
    const poll = vi.fn().mockRejectedValue(new Error("network down"));
    const controller = createFallbackController({ poll, pollIntervalMs: 10_000 });

    controller.handleStatus("CHANNEL_ERROR");

    vi.advanceTimersByTime(10_000);
    expect(poll).toHaveBeenCalledTimes(1);

    // Let the microtask queue drain the rejection.
    await vi.advanceTimersByTimeAsync(10_000);
    expect(poll).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(10_000);
    expect(poll).toHaveBeenCalledTimes(3);

    controller.dispose();
  });

  it("keeps the interval alive when poll() throws synchronously", () => {
    const poll = vi.fn().mockImplementation(() => {
      throw new Error("sync boom");
    });
    const controller = createFallbackController({ poll, pollIntervalMs: 10_000 });

    controller.handleStatus("CHANNEL_ERROR");

    vi.advanceTimersByTime(10_000);
    expect(poll).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(10_000);
    expect(poll).toHaveBeenCalledTimes(2);

    controller.dispose();
  });

  it("uses the injected clock override when provided (for fully deterministic tests)", () => {
    const setIntervalSpy = vi.fn().mockReturnValue(42 as unknown as ReturnType<typeof setInterval>);
    const clearIntervalSpy = vi.fn();
    const poll = vi.fn();

    const controller = createFallbackController({
      poll,
      pollIntervalMs: 10_000,
      now: {
        setInterval: setIntervalSpy as unknown as typeof setInterval,
        clearInterval: clearIntervalSpy as unknown as typeof clearInterval,
      },
    });

    controller.handleStatus("CHANNEL_ERROR");
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10_000);

    controller.handleStatus("SUBSCRIBED");
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    expect(clearIntervalSpy).toHaveBeenCalledWith(42);
  });

  it("covers all RealtimeStatus values without crashing (exhaustive smoke)", () => {
    const poll = vi.fn();
    const controller = createFallbackController({ poll, pollIntervalMs: 10_000 });

    const statuses: RealtimeStatus[] = ["SUBSCRIBED", "CHANNEL_ERROR", "TIMED_OUT", "CLOSED"];
    for (const s of statuses) {
      expect(() => controller.handleStatus(s)).not.toThrow();
    }

    controller.dispose();
  });
});
