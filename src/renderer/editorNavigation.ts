import type { EditorId } from "../shared/editorId";
import {
  NavigationHistory,
  type NavigationDirection,
  type NavigationHistorySnapshot
} from "./navigationHistory";

export type EditorResolveResult<TEditor> =
  | {
      readonly kind: "resolved";
      readonly editor: TEditor;
    }
  | {
      readonly kind: "notFound";
    }
  | {
      readonly kind: "unavailable";
      readonly error: unknown;
    };

export type EditorOpenHistoryPolicy = "record" | "skip";

export interface OpenEditorOptions<TEditor> {
  readonly history?: EditorOpenHistoryPolicy;
  readonly resolvedEditor?: TEditor;
}

export interface EditorNavigationAdapter<TEditor> {
  resolveEditor(editorId: EditorId): Promise<EditorResolveResult<TEditor>>;
  applyEditor(editorId: EditorId, editor: TEditor): void | Promise<void>;
}

export class EditorNavigation<TEditor> {
  private readonly history = new NavigationHistory();
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(private adapter: EditorNavigationAdapter<TEditor>) {}

  updateAdapter(adapter: EditorNavigationAdapter<TEditor>): void {
    this.adapter = adapter;
  }

  openEditor(
    editorId: EditorId,
    options: OpenEditorOptions<TEditor> = {}
  ): Promise<boolean> {
    return this.enqueue(async () => {
      const editor =
        options.resolvedEditor ??
        (await this.resolveEditorForOpen(editorId));

      if (!editor) {
        return false;
      }

      await this.adapter.applyEditor(editorId, editor);

      if ((options.history ?? "record") === "record") {
        this.history.record(editorId);
      }

      return true;
    });
  }

  navigateBack(): Promise<boolean> {
    return this.navigateHistory("back");
  }

  navigateForward(): Promise<boolean> {
    return this.navigateHistory("forward");
  }

  reset(): void {
    this.history.reset();
  }

  snapshot(): NavigationHistorySnapshot {
    return this.history.snapshot();
  }

  private navigateHistory(direction: NavigationDirection): Promise<boolean> {
    return this.enqueue(async () => {
      let candidate = this.history.candidate(direction);

      while (candidate) {
        const result = await this.adapter.resolveEditor(candidate.editorId);

        switch (result.kind) {
          case "resolved":
            if (!this.history.moveTo(candidate)) {
              return false;
            }

            await this.adapter.applyEditor(candidate.editorId, result.editor);
            return true;
          case "notFound":
            this.history.invalidate(candidate.editorId);
            candidate = this.history.candidate(direction);
            continue;
          case "unavailable":
            throw result.error;
        }
      }

      return false;
    });
  }

  private async resolveEditorForOpen(
    editorId: EditorId
  ): Promise<TEditor | null> {
    const result = await this.adapter.resolveEditor(editorId);

    switch (result.kind) {
      case "resolved":
        return result.editor;
      case "notFound":
        return null;
      case "unavailable":
        throw result.error;
    }
  }

  private enqueue<TResult>(operation: () => Promise<TResult>): Promise<TResult> {
    const queuedOperation = this.operationQueue.then(operation, operation);

    this.operationQueue = queuedOperation.then(
      () => undefined,
      () => undefined
    );

    return queuedOperation;
  }
}
