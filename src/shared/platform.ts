/**
 * Renderer-safe application platform vocabulary (#182).
 *
 * This is intentionally distinct from `NodeJS.Platform` (`win32` / `darwin` /
 * `linux` / ...): renderer-facing code must not depend on Node platform
 * values or `@types/node`. The mapping from the real runtime platform to
 * this closed set happens at the application boundary (preload), not here.
 */
export type AppPlatform = "windows" | "macos" | "linux" | "other";
