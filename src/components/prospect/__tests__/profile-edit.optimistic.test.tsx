import { describe, it, expect, vi } from "vitest";
import { runFieldSave } from "../lib/profile-edit-reducer";

describe("runFieldSave (pure orchestration)", () => {
  it("commits the new value on save success", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onRevert = vi.fn();
    const toast = vi.fn();

    const result = await runFieldSave({
      newValue: "new title",
      previousValue: "old title",
      onSave,
      onRevert,
      toast,
    });

    expect(result.committed).toBe(true);
    expect(onSave).toHaveBeenCalledWith("new title");
    expect(onRevert).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it("reverts value and fires destructive toast when onSave throws Error", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("URL invalid"));
    const onRevert = vi.fn();
    const toast = vi.fn();

    const result = await runFieldSave({
      newValue: "https://bad",
      previousValue: "https://good",
      onSave,
      onRevert,
      toast,
    });

    expect(result.committed).toBe(false);
    expect(onRevert).toHaveBeenCalledWith("https://good");
    expect(toast).toHaveBeenCalledTimes(1);
    const toastArg = toast.mock.calls[0][0];
    expect(toastArg.variant).toBe("destructive");
    expect(toastArg.description).toBe("URL invalid");
  });

  it("reverts to null when previousValue is null", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("nope"));
    const onRevert = vi.fn();

    await runFieldSave({
      newValue: "something",
      previousValue: null,
      onSave,
      onRevert,
      toast: vi.fn(),
    });

    expect(onRevert).toHaveBeenCalledWith(null);
  });

  it("uses a generic description when the thrown error has no message", async () => {
    const onSave = vi.fn().mockRejectedValue({}); // non-Error reject
    const toast = vi.fn();

    await runFieldSave({
      newValue: "x",
      previousValue: null,
      onSave,
      onRevert: vi.fn(),
      toast,
    });

    const toastArg = toast.mock.calls[0][0];
    expect(typeof toastArg.description).toBe("string");
    expect(toastArg.description.length).toBeGreaterThan(0);
  });

  it("includes a label in the toast title when provided", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("fail"));
    const toast = vi.fn();

    await runFieldSave({
      newValue: "x",
      previousValue: null,
      onSave,
      onRevert: vi.fn(),
      toast,
      label: "Title",
    });

    const toastArg = toast.mock.calls[0][0];
    expect(toastArg.title).toContain("Title");
  });

  it("does NOT fire toast or revert on success even when label is provided", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onRevert = vi.fn();
    const toast = vi.fn();

    await runFieldSave({
      newValue: "x",
      previousValue: null,
      onSave,
      onRevert,
      toast,
      label: "Title",
    });

    expect(onRevert).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });
});
