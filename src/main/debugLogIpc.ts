import { ipcMain, type WebContents } from "electron";
import { DEBUG_LOG_CHANNELS } from "../shared/api";
import { getDebugLogger, type DebugLogger } from "./debugLogger";

type SubscriptionCleanup = () => void;

export function registerDebugLogIpc(
  logger: DebugLogger = getDebugLogger()
): void {
  const subscriptions = new Map<number, SubscriptionCleanup>();

  function cleanupSubscription(webContents: WebContents): void {
    const cleanup = subscriptions.get(webContents.id);

    if (cleanup) {
      cleanup();
    }
  }

  ipcMain.handle(DEBUG_LOG_CHANNELS.logEvent, (_event, rawRequest: unknown) => {
    logger.logRendererRequest(rawRequest);
  });

  ipcMain.handle(DEBUG_LOG_CHANNELS.getSnapshot, () => logger.getSnapshot());

  ipcMain.on(DEBUG_LOG_CHANNELS.subscribe, (event) => {
    const webContents = event.sender;

    cleanupSubscription(webContents);

    const unsubscribeFromLogger = logger.subscribe((debugLogEvent) => {
      if (!webContents.isDestroyed()) {
        webContents.send(DEBUG_LOG_CHANNELS.event, debugLogEvent);
      }
    });

    const cleanup = () => {
      unsubscribeFromLogger();
      subscriptions.delete(webContents.id);
      webContents.off("destroyed", cleanup);
    };

    subscriptions.set(webContents.id, cleanup);
    webContents.once("destroyed", cleanup);
  });

  ipcMain.on(DEBUG_LOG_CHANNELS.unsubscribe, (event) => {
    cleanupSubscription(event.sender);
  });
}
