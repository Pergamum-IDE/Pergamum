import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { GlossaryEntry } from "../../src/shared/glossary";
import type { Translate } from "../../src/shared/i18n";
import { GlossaryEditor } from "../../src/renderer/GlossaryEditor";
import { createGlossaryEntryDraft } from "../../src/renderer/glossaryEntryDraft";

const translate: Translate = (key) => key;

const entry: GlossaryEntry = {
  id: "018f4b8c-7a2b-7c3d-8e4f-123456789abc",
  kind: "place",
  description: "王国の首都",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  forms: [
    {
      id: "018f4b8c-7a2b-7c3d-8e4f-223456789abc",
      entryId: "018f4b8c-7a2b-7c3d-8e4f-123456789abc",
      surface: "王都",
      relation: null,
      warningPolicy: null,
      isCanonical: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    {
      id: "018f4b8c-7a2b-7c3d-8e4f-323456789abc",
      entryId: "018f4b8c-7a2b-7c3d-8e4f-123456789abc",
      surface: "首都",
      relation: "alias",
      warningPolicy: "default",
      isCanonical: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    },
    {
      id: "018f4b8c-7a2b-7c3d-8e4f-423456789abc",
      entryId: "018f4b8c-7a2b-7c3d-8e4f-123456789abc",
      surface: "王都",
      relation: "variant",
      warningPolicy: "warn",
      isCanonical: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    }
  ]
};

type GlossaryEditorPropsForTest = Parameters<typeof GlossaryEditor>[0];

type ElementProps = Record<string, unknown> & {
  children?: React.ReactNode;
};

function collectElements(
  node: React.ReactNode,
  predicate: (element: React.ReactElement<ElementProps>) => boolean
): React.ReactElement<ElementProps>[] {
  const elements: React.ReactElement<ElementProps>[] = [];

  React.Children.forEach(node, (child) => {
    if (!React.isValidElement<ElementProps>(child)) {
      return;
    }

    if (predicate(child)) {
      elements.push(child);
    }

    elements.push(...collectElements(child.props.children, predicate));
  });

  return elements;
}

function glossaryEditorProps(
  overrides: Partial<GlossaryEditorPropsForTest> = {}
): GlossaryEditorPropsForTest {
  return {
    draft: createGlossaryEntryDraft(entry),
    translate,
    onChangeKind: () => undefined,
    onChangeDescription: () => undefined,
    onChangeCanonicalSurface: () => undefined,
    onAddForm: () => undefined,
    onChangeFormSurface: () => undefined,
    onChangeFormWarningPolicy: () => undefined,
    onDeleteForm: () => undefined,
    ...overrides
  };
}

describe("GlossaryEditor", () => {
  it("lets the kind field be edited and reports the new kind through onChangeKind", () => {
    const onChangeKind = vi.fn();
    const draft = createGlossaryEntryDraft(entry);
    const element = GlossaryEditor(glossaryEditorProps({
      draft,
      onChangeKind
    }));
    const selects = collectElements(
      element,
      (child) => child.type === "select"
    );

    expect(selects.length).toBeGreaterThan(1);
    expect(selects[0].props.value).toBe("place");

    const onChange = selects[0].props.onChange as (event: unknown) => void;
    onChange({ target: { value: "person" } });

    expect(onChangeKind).toHaveBeenCalledWith("person");
  });

  it("reports canonical surface edits", () => {
    const onChangeCanonicalSurface = vi.fn();
    const element = GlossaryEditor(
      glossaryEditorProps({ onChangeCanonicalSurface })
    );
    const inputs = collectElements(
      element,
      (child) => child.type === "input"
    );

    expect(inputs[0].props.value).toBe("王都");

    const onChange = inputs[0].props.onChange as (event: unknown) => void;
    onChange({ target: { value: "新王都" } });

    expect(onChangeCanonicalSurface).toHaveBeenCalledWith("新王都");
  });

  it("reports alias and variant surface edits", () => {
    const onChangeFormSurface = vi.fn();
    const element = GlossaryEditor(
      glossaryEditorProps({ onChangeFormSurface })
    );
    const inputs = collectElements(
      element,
      (child) => child.type === "input"
    );

    expect(inputs[1].props.value).toBe("首都");
    expect(inputs[2].props.value).toBe("王都");

    const aliasOnChange = inputs[1].props.onChange as (
      event: unknown
    ) => void;
    const variantOnChange = inputs[2].props.onChange as (
      event: unknown
    ) => void;

    aliasOnChange({ target: { value: "王都アルセリア" } });
    variantOnChange({ target: { value: "王都 Arceria" } });

    expect(onChangeFormSurface).toHaveBeenCalledWith(
      "018f4b8c-7a2b-7c3d-8e4f-323456789abc",
      "王都アルセリア"
    );
    expect(onChangeFormSurface).toHaveBeenCalledWith(
      "018f4b8c-7a2b-7c3d-8e4f-423456789abc",
      "王都 Arceria"
    );
  });

  it("reports warning policy changes", () => {
    const onChangeFormWarningPolicy = vi.fn();
    const element = GlossaryEditor(
      glossaryEditorProps({ onChangeFormWarningPolicy })
    );
    const selects = collectElements(
      element,
      (child) => child.type === "select"
    );

    expect(selects[1].props.value).toBe("default");
    expect(selects[2].props.value).toBe("warn");

    const onChange = selects[1].props.onChange as (event: unknown) => void;
    onChange({ target: { value: "ignore" } });

    expect(onChangeFormWarningPolicy).toHaveBeenCalledWith(
      "018f4b8c-7a2b-7c3d-8e4f-323456789abc",
      "ignore"
    );
  });

  it("reports alias and variant add and delete actions", () => {
    const onAddForm = vi.fn();
    const onDeleteForm = vi.fn();
    const element = GlossaryEditor(
      glossaryEditorProps({ onAddForm, onDeleteForm })
    );
    const buttons = collectElements(
      element,
      (child) => child.type === "button"
    );

    const aliasRemoveButton = buttons.find(
      (button) => button.props.children === "glossaryEditor.removeForm"
    );
    const aliasAddButton = buttons.find(
      (button) => button.props.children === "glossaryEditor.addAlias"
    );
    const variantAddButton = buttons.find(
      (button) => button.props.children === "glossaryEditor.addVariant"
    );

    expect(aliasRemoveButton).toBeDefined();
    expect(aliasAddButton).toBeDefined();
    expect(variantAddButton).toBeDefined();

    (aliasRemoveButton?.props.onClick as () => void)();
    (aliasAddButton?.props.onClick as () => void)();
    (variantAddButton?.props.onClick as () => void)();

    expect(onDeleteForm).toHaveBeenCalledWith(
      "018f4b8c-7a2b-7c3d-8e4f-323456789abc"
    );
    expect(onAddForm).toHaveBeenCalledWith("alias");
    expect(onAddForm).toHaveBeenCalledWith("variant");
  });

  it("passes the draft description to the Markdown editor for editing", () => {
    const draft = createGlossaryEntryDraft(entry);
    const onChangeDescription = vi.fn();
    const element = GlossaryEditor(glossaryEditorProps({
      draft: { ...draft, description: "編集中の説明" },
      onChangeDescription
    }));
    const markdownEditors = collectElements(
      element,
      (child) => typeof child.type === "function" && child.type.name === "MarkdownEditor"
    );

    expect(markdownEditors).toHaveLength(1);
    expect(markdownEditors[0].props.value).toBe("編集中の説明");
    expect(markdownEditors[0].props.onChange).toBe(onChangeDescription);
  });

  it("renders the draft description as Markdown preview, not raw source", () => {
    const draft = {
      ...createGlossaryEntryDraft(entry),
      description: "**強調**テキスト"
    };
    const markup = renderToStaticMarkup(
      React.createElement(GlossaryEditor, glossaryEditorProps({
        draft,
      }))
    );

    expect(markup).toContain("<strong>強調</strong>");
    expect(markup).not.toContain("**強調**");
  });

  it("shows the empty-description placeholder only when the draft description is blank", () => {
    const draft = createGlossaryEntryDraft(entry);
    const emptyMarkup = renderToStaticMarkup(
      React.createElement(GlossaryEditor, glossaryEditorProps({
        draft: { ...draft, description: "  " },
      }))
    );
    const filledMarkup = renderToStaticMarkup(
      React.createElement(GlossaryEditor, glossaryEditorProps({
        draft: { ...draft, description: "本文" },
      }))
    );

    expect(emptyMarkup).toContain("glossaryEditor.emptyDescription");
    expect(filledMarkup).not.toContain("glossaryEditor.emptyDescription");
    expect(filledMarkup).toContain("本文");
  });

  it("renders canonical surface and forms as editable inputs", () => {
    const draft = {
      ...createGlossaryEntryDraft(entry),
      kind: "person" as const,
      description: "変更後"
    };
    const markup = renderToStaticMarkup(
      React.createElement(GlossaryEditor, glossaryEditorProps({
        draft,
      }))
    );

    expect(markup).toContain("王都");
    expect(markup).toContain("首都");
    expect(markup).toContain("王都");
    expect(markup).toMatch(/<input[^>]*value="王都"/);
    expect(markup).toMatch(/<input[^>]*value="首都"/);
  });
});
