import { describe, expect, it, vi } from "vitest";
import {
  choiceDialogChosenResult,
  choiceDialogDismissedResult,
  handleChoiceDialogBackdropClick,
  handleChoiceDialogKeyDown
} from "../../../src/renderer/dialog/choiceDialogHandlers";

describe("choice dialog results (#192)", () => {
  it("resolves a clicked choice by stable id, not label", () => {
    expect(choiceDialogChosenResult("save")).toEqual({
      kind: "chosen",
      id: "save"
    });
  });

  it("keeps explicit cancel choice distinct from dismissed", () => {
    expect(choiceDialogChosenResult("cancel")).toEqual({
      kind: "chosen",
      id: "cancel"
    });
    expect(choiceDialogChosenResult("cancel")).not.toEqual(
      choiceDialogDismissedResult()
    );
  });
});

describe("handleChoiceDialogBackdropClick (#192)", () => {
  it("resolves dismissed when backdrop dismissal is enabled", () => {
    const onResult = vi.fn();

    handleChoiceDialogBackdropClick(onResult, true);

    expect(onResult).toHaveBeenCalledWith({ kind: "dismissed" });
    expect(onResult).toHaveBeenCalledTimes(1);
  });

  it("does not call onResult when backdrop dismissal is disabled", () => {
    const onResult = vi.fn();

    handleChoiceDialogBackdropClick(onResult, false);

    expect(onResult).not.toHaveBeenCalled();
  });
});

describe("handleChoiceDialogKeyDown (#192)", () => {
  it("Escape resolves dismissed", () => {
    const onResult = vi.fn();

    const handled = handleChoiceDialogKeyDown({ key: "Escape" }, onResult);

    expect(handled).toBe(true);
    expect(onResult).toHaveBeenCalledWith({ kind: "dismissed" });
  });

  it("Enter is left to native focused button activation", () => {
    const onResult = vi.fn();

    const handled = handleChoiceDialogKeyDown({ key: "Enter" }, onResult);

    expect(handled).toBe(false);
    expect(onResult).not.toHaveBeenCalled();
  });

  it("Space is left to native focused button activation", () => {
    const onResult = vi.fn();

    const handled = handleChoiceDialogKeyDown({ key: " " }, onResult);

    expect(handled).toBe(false);
    expect(onResult).not.toHaveBeenCalled();
  });

  it("Tab is left to the focus trap", () => {
    const onResult = vi.fn();

    const handled = handleChoiceDialogKeyDown({ key: "Tab" }, onResult);

    expect(handled).toBe(false);
    expect(onResult).not.toHaveBeenCalled();
  });
});
