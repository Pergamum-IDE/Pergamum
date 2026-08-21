import { describe, expect, it } from "vitest";
import {
  AppDialogError,
  confirmDialogDismissesOnBackdropClick,
  getDialogActionOrder,
  type AppConfirmDialogOptions
} from "../../../src/renderer/dialog/appDialogTypes";

function baseOptions(): AppConfirmDialogOptions {
  return {
    title: "Title",
    message: { kind: "plainText", text: "Message" },
    icon: null,
    clipboardText: null
  };
}

describe("getDialogActionOrder (#182 D-11)", () => {
  it('returns "confirmCancel" for windows', () => {
    expect(getDialogActionOrder("windows")).toBe("confirmCancel");
  });

  it('returns "confirmCancel" for linux', () => {
    expect(getDialogActionOrder("linux")).toBe("confirmCancel");
  });

  it('returns "cancelConfirm" for macos', () => {
    expect(getDialogActionOrder("macos")).toBe("cancelConfirm");
  });

  it('returns "cancelConfirm" for other', () => {
    expect(getDialogActionOrder("other")).toBe("cancelConfirm");
  });
});

describe("AppDialogError (#182 D-14)", () => {
  it("carries the dialogAlreadyOpen kind", () => {
    const error = new AppDialogError("dialogAlreadyOpen");

    expect(error.kind).toBe("dialogAlreadyOpen");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("confirmDialogDismissesOnBackdropClick (#184 follow-up)", () => {
  it("defaults to true when dismissOnBackdropClick is omitted (existing call sites keep their current behavior)", () => {
    expect(confirmDialogDismissesOnBackdropClick(baseOptions())).toBe(true);
  });

  it("is true when dismissOnBackdropClick is explicitly true", () => {
    expect(
      confirmDialogDismissesOnBackdropClick({
        ...baseOptions(),
        dismissOnBackdropClick: true
      })
    ).toBe(true);
  });

  it("is false when dismissOnBackdropClick is explicitly false", () => {
    expect(
      confirmDialogDismissesOnBackdropClick({
        ...baseOptions(),
        dismissOnBackdropClick: false
      })
    ).toBe(false);
  });
});

describe("AppConfirmDialogOptions destructive confirmLabel enforcement (#182 D-10, type-level)", () => {
  it("accepts a default-tone options object without confirmLabel", () => {
    const options: AppConfirmDialogOptions = {
      title: "Title",
      message: { kind: "plainText", text: "Message" },
      icon: null,
      clipboardText: null
    };

    expect(options.tone ?? "default").toBe("default");
  });

  it("accepts a destructive-tone options object that provides confirmLabel", () => {
    const options: AppConfirmDialogOptions = {
      title: "Title",
      message: { kind: "plainText", text: "Message" },
      icon: null,
      clipboardText: null,
      tone: "destructive",
      confirmLabel: "削除"
    };

    expect(options.tone).toBe("destructive");
  });

  it("rejects a destructive-tone options object missing confirmLabel at the type level", () => {
    // @ts-expect-error tone: "destructive" requires a concrete confirmLabel
    const options: AppConfirmDialogOptions = {
      title: "Title",
      message: { kind: "plainText", text: "Message" },
      icon: null,
      clipboardText: null,
      tone: "destructive"
    };

    void options;
  });
});
