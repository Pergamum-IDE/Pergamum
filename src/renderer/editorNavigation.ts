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
  private generation = 0;

  constructor(private adapter: EditorNavigationAdapter<TEditor>) {}

  updateAdapter(adapter: EditorNavigationAdapter<TEditor>): void {
    this.adapter = adapter;
  }

  openEditor(
    editorId: EditorId,
    options: OpenEditorOptions<TEditor> = {}
  ): Promise<boolean> {
    const generation = this.generation;

    return this.enqueue(async () => {
      if (!this.isCurrentGeneration(generation)) {
        return false;
      }

      const editor =
        options.resolvedEditor ??
        (await this.resolveEditorForOpen(editorId, generation));

      if (!editor || !this.isCurrentGeneration(generation)) {
        return false;
      }

      await this.adapter.applyEditor(editorId, editor);

      if (!this.isCurrentGeneration(generation)) {
        return false;
      }

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
    this.generation += 1;
    this.history.reset();
  }

  snapshot(): NavigationHistorySnapshot {
    return this.history.snapshot();
  }

  private navigateHistory(direction: NavigationDirection): Promise<boolean> {
    const generation = this.generation;

    return this.enqueue(async () => {
      if (!this.isCurrentGeneration(generation)) {
        return false;
      }

      let candidate = this.history.candidate(direction);

      while (candidate) {
        const result = await this.adapter.resolveEditor(candidate.editorId);

        if (!this.isCurrentGeneration(generation)) {
          return false;
        }

        switch (result.kind) {
          case "resolved":
            if (!this.history.moveTo(candidate)) {
              return false;
            }

            if (!this.isCurrentGeneration(generation)) {
              return false;
            }

            await this.adapter.applyEditor(candidate.editorId, result.editor);

            if (!this.isCurrentGeneration(generation)) {
              return false;
            }

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
    editorId: EditorId,
    generation: number
  ): Promise<TEditor | null> {
    const result = await this.adapter.resolveEditor(editorId);

    if (!this.isCurrentGeneration(generation)) {
      return null;
    }

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

  private isCurrentGeneration(generation: number): boolean {
    return generation === this.generation;
  }
}
