import { describe, expect, it, vi } from "vitest";
import {
  documentTabTrailingSlotKind,
  handleDocumentTabCloseButtonClick,
  handleDocumentTabMiddleClick
} from "../../src/renderer/documentTabHandlers";
import {
  createProjectDocumentEditorId,
  type ActiveProjectContext,
  type EditorId
} from "../../src/shared/editorId";

const projectContext: ActiveProjectContext = { rootPath: "C:\\Novel" };
const editorId: EditorId = createProjectDocumentEditorId(
  "chapter-01.md",
  projectContext
);

function mockEvent() {
  return {
    button: 0,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn()
  };
}

describe("documentTabTrailingSlotKind (#184)", () => {
  it("shows close on an active clean tab", () => {
    expect(documentTabTrailingSlotKind(true, false, false)).toBe("close");
  });

  it("shows close on an active dirty tab (close takes precedence over dirty)", () => {
    expect(documentTabTrailingSlotKind(true, true, false)).toBe("close");
  });

  it("shows empty on an inactive clean unhovered tab", () => {
    expect(documentTabTrailingSlotKind(false, false, false)).toBe("empty");
  });

  it("shows dirty on an inactive dirty unhovered tab", () => {
    expect(documentTabTrailingSlotKind(false, true, false)).toBe("dirty");
  });

  it("shows close on a hovered clean tab", () => {
    expect(documentTabTrailingSlotKind(false, false, true)).toBe("close");
  });

  it("shows close, not dirty, on a hovered dirty tab", () => {
    expect(documentTabTrailingSlotKind(false, true, true)).toBe("close");
  });
});

describe("handleDocumentTabCloseButtonClick (#184)", () => {
  it("prevents default and stops propagation so the tab is not selected first", () => {
    const event = mockEvent();
    const onClose = vi.fn();

    handleDocumentTabCloseButtonClick(event, editorId, onClose);

    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it("closes the clicked tab's editor ID", () => {
    const onClose = vi.fn();

    handleDocumentTabCloseButtonClick(mockEvent(), editorId, onClose);

    expect(onClose).toHaveBeenCalledWith(editorId);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("handleDocumentTabMiddleClick (#184)", () => {
  it("closes the clicked tab and returns true for the middle mouse button (button 1)", () => {
    const event = { ...mockEvent(), button: 1 };
    const onClose = vi.fn();

    const handled = handleDocumentTabMiddleClick(event, editorId, onClose);

    expect(handled).toBe(true);
    expect(onClose).toHaveBeenCalledWith(editorId);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(event.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it("does nothing and returns false for the primary button (button 0)", () => {
    const event = mockEvent();
    const onClose = vi.fn();

    const handled = handleDocumentTabMiddleClick(event, editorId, onClose);

    expect(handled).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(event.stopPropagation).not.toHaveBeenCalled();
  });

  it("does nothing and returns false for the secondary button (button 2)", () => {
    const event = { ...mockEvent(), button: 2 };
    const onClose = vi.fn();

    const handled = handleDocumentTabMiddleClick(event, editorId, onClose);

    expect(handled).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
  });
});
