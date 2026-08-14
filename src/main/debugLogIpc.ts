import { ipcMain } from "electron";
import { DEBUG_LOG_CHANNELS } from "../shared/api";
import { getDebugLogger, type DebugLogger } from "./debugLogger";

export function registerDebugLogIpc(
  logger: DebugLogger = getDebugLogger()
): void {
  ipcMain.handle(DEBUG_LOG_CHANNELS.logEvent, (_event, rawRequest: unknown) => {
    logger.logRendererRequest(rawRequest);
  });
}

