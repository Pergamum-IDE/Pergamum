import fs from "node:fs";
import { resolveDebugLogFilePath } from "./debugLogPath";

export const DEFAULT_DEBUG_LOG_MAX_LINES = 10_000;
export const DEFAULT_DEBUG_LOG_PRE_SINK_QUEUE_LIMIT = 200;
export const DEBUG_LOG_FILENAME_COLLISION_SUFFIX_LIMIT = 99;

export interface DebugLogFileSystem {
  mkdirSync(path: string, options: { recursive: true }): void;
  openSync(path: string, flags: string): number;
  writeSync(fd: number, data: string): number;
  closeSync(fd: number): void;
}

export interface JsonlDebugLogSinkOptions {
  logsDir: string;
  sessionId: string;
  maxLines?: number;
  fileSystem?: DebugLogFileSystem;
  isDevelopmentBuild?: boolean;
  warn?: (message: string) => void;
}

function isFileExistsError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "EEXIST"
  );
}

export class JsonlDebugLogSink {
  private readonly fileSystem: DebugLogFileSystem;
  private readonly maxLines: number;
  private readonly isDevelopmentBuild: boolean;
  private readonly warn: (message: string) => void;
  private fileDescriptor: number | null = null;
  private currentLineCount = 0;
  private degraded = false;
  private writeFailureRecorded = false;
  private openedFilePath: string | null = null;

  constructor(private readonly options: JsonlDebugLogSinkOptions) {
    this.fileSystem = options.fileSystem ?? fs;
    this.maxLines = Math.max(1, options.maxLines ?? DEFAULT_DEBUG_LOG_MAX_LINES);
    this.isDevelopmentBuild =
      options.isDevelopmentBuild ?? process.env.NODE_ENV !== "production";
    this.warn = options.warn ?? ((message) => console.warn(message));
  }

  get isDegraded(): boolean {
    return this.degraded;
  }

  get isOpen(): boolean {
    return this.fileDescriptor !== null && !this.degraded;
  }

  get lineCount(): number {
    return this.currentLineCount;
  }

  get currentFilePath(): string | null {
    return this.openedFilePath;
  }

  open(openedAt: Date): boolean {
    if (this.degraded) {
      return false;
    }

    this.close();

    try {
      this.fileSystem.mkdirSync(this.options.logsDir, { recursive: true });
    } catch {
      this.markDegraded();
      return false;
    }

    const suffixes: Array<number | undefined> = [undefined];

    for (let suffix = 2; suffix <= DEBUG_LOG_FILENAME_COLLISION_SUFFIX_LIMIT; suffix += 1) {
      suffixes.push(suffix);
    }

    for (const suffix of suffixes) {
      const filePath = resolveDebugLogFilePath({
        logsDir: this.options.logsDir,
        sessionId: this.options.sessionId,
        openedAt,
        suffix
      });

      try {
        this.fileDescriptor = this.fileSystem.openSync(filePath, "wx");
        this.currentLineCount = 0;
        this.openedFilePath = filePath;
        return true;
      } catch (error) {
        if (isFileExistsError(error)) {
          continue;
        }

        this.markDegraded();
        return false;
      }
    }

    this.markDegraded();
    return false;
  }

  shouldRotate(): boolean {
    return this.isOpen && this.currentLineCount >= this.maxLines;
  }

  writeLine(line: string): boolean {
    if (!this.isOpen || this.fileDescriptor === null) {
      return false;
    }

    try {
      this.fileSystem.writeSync(this.fileDescriptor, `${line}\n`);
      this.currentLineCount += 1;
      return true;
    } catch {
      this.recordWriteFailure();
      return false;
    }
  }

  close(): void {
    if (this.fileDescriptor === null) {
      return;
    }

    const fileDescriptor = this.fileDescriptor;
    this.fileDescriptor = null;
    this.currentLineCount = 0;

    try {
      this.fileSystem.closeSync(fileDescriptor);
    } catch {
      this.markDegraded();
    }
  }

  private recordWriteFailure(): void {
    if (!this.writeFailureRecorded) {
      this.writeFailureRecorded = true;
      this.warnIfDevelopment("Pergamum debug log write failed.");
    }

    this.markDegraded();
  }

  private markDegraded(): void {
    if (this.fileDescriptor !== null) {
      const fileDescriptor = this.fileDescriptor;
      this.fileDescriptor = null;

      try {
        this.fileSystem.closeSync(fileDescriptor);
      } catch {
        // The sink is already degraded; do not throw from logger cleanup.
      }
    }

    this.degraded = true;
    this.warnIfDevelopment("Pergamum debug log sink degraded.");
  }

  private warnIfDevelopment(message: string): void {
    if (this.isDevelopmentBuild) {
      this.warn(message);
    }
  }
}

