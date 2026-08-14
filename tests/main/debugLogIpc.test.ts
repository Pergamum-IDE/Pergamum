import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEBUG_LOG_CHANNELS } from "../../src/shared/api";
import type { DebugLogger } from "../../src/main/debugLogger";

const electronMock = vi.hoisted(() => ({
  handle: vi.fn()
}));

vi.mock("electron", () => ({
  ipcMain: {
    handle: electronMock.handle
  }
}));

import { registerDebugLogIpc } from "../../src/main/debugLogIpc";

describe("debug log IPC", () => {
  beforeEach(() => {
    electronMock.handle.mockClear();
  });

  it("routes renderer logging requests through the main debug logger", () => {
    const logger = {
      logRendererRequest: vi.fn()
    } as unknown as DebugLogger;
    registerDebugLogIpc(logger);

    const handler = registeredHandler(DEBUG_LOG_CHANNELS.logEvent);
    const request = {
      level: "debug",
      event: "command.invoked",
      details: {
        commandId: "workspace.files.focus",
        fileName: "must-not-be-trusted.md"
      }
    };

    handler({ sender: {} }, request);

    expect(logger.logRendererRequest).toHaveBeenCalledWith(request);
  });
});

function registeredHandler(channel: string): (...args: unknown[]) => unknown {
  const registration = electronMock.handle.mock.calls.find(
    ([registeredChannel]) => registeredChannel === channel
  );

  if (!registration) {
    throw new Error(`Handler was not registered for ${channel}.`);
  }

  return registration[1] as (...args: unknown[]) => unknown;
}

