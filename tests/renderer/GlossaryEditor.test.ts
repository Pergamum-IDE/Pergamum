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
    }
  ]
};

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

describe("GlossaryEditor", () => {
  it("lets the kind field be edited and reports the new kind through onChangeKind", () => {
    const onChangeKind = vi.fn();
    const draft = createGlossaryEntryDraft(entry);
    const element = GlossaryEditor({
      draft,
      translate,
      onChangeKind,
      onChangeDescription: () => undefined
    });
    const selects = collectElements(
      element,
      (child) => child.type === "select"
    );

    expect(selects).toHaveLength(1);
    expect(selects[0].props.value).toBe("place");

    const onChange = selects[0].props.onChange as (event: unknown) => void;
    onChange({ target: { value: "person" } });

    expect(onChangeKind).toHaveBeenCalledWith("person");
  });

  it("passes the draft description to the Markdown editor for editing", () => {
    const draft = createGlossaryEntryDraft(entry);
    const onChangeDescription = vi.fn();
    const element = GlossaryEditor({
      draft: { ...draft, description: "編集中の説明" },
      translate,
      onChangeKind: () => undefined,
      onChangeDescription
    });
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
      React.createElement(GlossaryEditor, {
        draft,
        translate,
        onChangeKind: () => undefined,
        onChangeDescription: () => undefined
      })
    );

    expect(markup).toContain("<strong>強調</strong>");
    expect(markup).not.toContain("**強調**");
  });

  it("shows the empty-description placeholder only when the draft description is blank", () => {
    const draft = createGlossaryEntryDraft(entry);
    const emptyMarkup = renderToStaticMarkup(
      React.createElement(GlossaryEditor, {
        draft: { ...draft, description: "  " },
        translate,
        onChangeKind: () => undefined,
        onChangeDescription: () => undefined
      })
    );
    const filledMarkup = renderToStaticMarkup(
      React.createElement(GlossaryEditor, {
        draft: { ...draft, description: "本文" },
        translate,
        onChangeKind: () => undefined,
        onChangeDescription: () => undefined
      })
    );

    expect(emptyMarkup).toContain("glossaryEditor.emptyDescription");
    expect(filledMarkup).not.toContain("glossaryEditor.emptyDescription");
    expect(filledMarkup).toContain("本文");
  });

  it("keeps canonical surface and forms read-only regardless of draft edits", () => {
    const draft = {
      ...createGlossaryEntryDraft(entry),
      kind: "person" as const,
      description: "変更後"
    };
    const markup = renderToStaticMarkup(
      React.createElement(GlossaryEditor, {
        draft,
        translate,
        onChangeKind: () => undefined,
        onChangeDescription: () => undefined
      })
    );

    expect(markup).toContain("王都");
    expect(markup).toContain("首都");
    expect(markup).not.toMatch(/<input[^>]*value="王都"/);
  });
});
