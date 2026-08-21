import { describe, expect, it, vi } from "vitest";
import { AppDialogError } from "../../../src/renderer/dialog/appDialogTypes";
import { DialogController } from "../../../src/renderer/dialog/dialogController";
import type { AppConfirmDialogOptions } from "../../../src/renderer/dialog/appDialogTypes";

function baseOptions(): AppConfirmDialogOptions {
  return {
    title: "Title",
    message: { kind: "plainText", text: "Message" },
    icon: null,
    clipboardText: null
  };
}

describe("DialogController (#182 core state machine, DOM-free)", () => {
  it("has no pending request before confirm() is called", () => {
    const controller = new DialogController();

    expect(controller.getPendingRequest()).toBeNull();
  });

  it("confirm() sets a pending request and notifies subscribers", () => {
    const controller = new DialogController();
    const onChange = vi.fn();

    controller.subscribe(onChange);
    void controller.confirm(baseOptions());

    expect(controller.getPendingRequest()).not.toBeNull();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("resolve() resolves the pending confirm's promise with the given result", async () => {
    const controller = new DialogController();
    const resultPromise = controller.confirm(baseOptions());

    controller.resolve("confirm");

    await expect(resultPromise).resolves.toBe("confirm");
  });

  it("resolve() clears the pending request", () => {
    const controller = new DialogController();

    void controller.confirm(baseOptions());
    controller.resolve("cancel");

    expect(controller.getPendingRequest()).toBeNull();
  });

  it("resolve() with no pending request is a no-op", () => {
    const controller = new DialogController();

    expect(() => controller.resolve("cancel")).not.toThrow();
    expect(controller.getPendingRequest()).toBeNull();
  });

  it("a second concurrent confirm() rejects with AppDialogError(dialogAlreadyOpen)", async () => {
    const controller = new DialogController();

    void controller.confirm(baseOptions());
    const second = controller.confirm(baseOptions());

    await expect(second).rejects.toBeInstanceOf(AppDialogError);
    await expect(second).rejects.toMatchObject({ kind: "dialogAlreadyOpen" });
  });

  it("a concurrent confirm() request does not resolve as cancel", async () => {
    const controller = new DialogController();

    void controller.confirm(baseOptions());
    const second = controller.confirm(baseOptions());
    let rejected = false;

    try {
      await second;
    } catch {
      rejected = true;
    }

    expect(rejected).toBe(true);
  });

  it("the first request is unaffected by a rejected concurrent second request", async () => {
    const controller = new DialogController();
    const first = controller.confirm(baseOptions());

    await expect(controller.confirm(baseOptions())).rejects.toBeInstanceOf(
      AppDialogError
    );

    controller.resolve("confirm");
    await expect(first).resolves.toBe("confirm");
  });

  it("a new confirm() succeeds again after the pending one resolves", async () => {
    const controller = new DialogController();

    controller.resolve("cancel"); // no-op, nothing pending
    const first = controller.confirm(baseOptions());
    controller.resolve("confirm");
    await expect(first).resolves.toBe("confirm");

    const second = controller.confirm(baseOptions());
    expect(controller.getPendingRequest()).not.toBeNull();
    controller.resolve("cancel");
    await expect(second).resolves.toBe("cancel");
  });

  it("dispose() resolves a pending confirm as cancel (host unmount, D-16)", async () => {
    const controller = new DialogController();
    const pending = controller.confirm(baseOptions());

    controller.dispose();

    await expect(pending).resolves.toBe("cancel");
    expect(controller.getPendingRequest()).toBeNull();
  });

  it("dispose() with nothing pending does not throw", () => {
    const controller = new DialogController();

    expect(() => controller.dispose()).not.toThrow();
  });

  it("subscribe() returns an unsubscribe function that stops notifications", () => {
    const controller = new DialogController();
    const onChange = vi.fn();
    const unsubscribe = controller.subscribe(onChange);

    unsubscribe();
    void controller.confirm(baseOptions());

    expect(onChange).not.toHaveBeenCalled();
  });
});
