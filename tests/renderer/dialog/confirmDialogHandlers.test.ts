import { describe, expect, it, vi } from "vitest";
import {
  handleConfirmDialogBackdropClick,
  handleConfirmDialogKeyDown
} from "../../../src/renderer/dialog/confirmDialogHandlers";

describe("handleConfirmDialogBackdropClick (#182 D-17 / #184 follow-up)", () => {
  it('resolves "cancel" when dismissOnBackdropClick is true', () => {
    const onResult = vi.fn();

    handleConfirmDialogBackdropClick(onResult, true);

    expect(onResult).toHaveBeenCalledWith("cancel");
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it("does not call onResult when dismissOnBackdropClick is false", () => {
    const onResult = vi.fn();

    handleConfirmDialogBackdropClick(onResult, false);

    expect(onResult).not.toHaveBeenCalled();
  });
});

describe("handleConfirmDialogKeyDown (#182 D-15)", () => {
  it('Escape resolves "cancel"', () => {
    const onResult = vi.fn();

    handleConfirmDialogKeyDown({ key: "Escape" }, onResult);

    expect(onResult).toHaveBeenCalledWith("cancel");
  });

  it('Escape calls onResult("cancel") exactly once', () => {
    const onResult = vi.fn();

    handleConfirmDialogKeyDown({ key: "Escape" }, onResult);

    expect(onResult).toHaveBeenCalledWith("cancel");
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it("Escape returns true", () => {
    const onResult = vi.fn();

    const handled = handleConfirmDialogKeyDown({ key: "Escape" }, onResult);

    expect(handled).toBe(true);
  });

  it("Enter does not resolve anything (no implicit dialog-wide Enter=confirm handler) and returns false", () => {
    const onResult = vi.fn();

    const handled = handleConfirmDialogKeyDown({ key: "Enter" }, onResult);

    expect(onResult).not.toHaveBeenCalled();
    expect(handled).toBe(false);
  });

  it("Tab does not resolve anything (handled separately by the focus trap) and returns false", () => {
    const onResult = vi.fn();

    const handled = handleConfirmDialogKeyDown({ key: "Tab" }, onResult);

    expect(onResult).not.toHaveBeenCalled();
    expect(handled).toBe(false);
  });

  it("an unrelated key does not resolve anything and returns false", () => {
    const onResult = vi.fn();

    const handled = handleConfirmDialogKeyDown({ key: "a" }, onResult);

    expect(onResult).not.toHaveBeenCalled();
    expect(handled).toBe(false);
  });
});
