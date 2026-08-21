import type { AppPlatform } from "../shared/platform";

/**
 * Maps the real Node/Electron runtime platform to the closed, renderer-safe
 * `AppPlatform` set (#182). This is the application boundary referred to by
 * the dialog foundation's platform-ordering decision: it is the only place
 * that should see `NodeJS.Platform` on the way to the renderer.
 */
export function nodePlatformToAppPlatform(
  platform: NodeJS.Platform
): AppPlatform {
  switch (platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "macos";
    case "linux":
      return "linux";
    default:
      return "other";
  }
}
