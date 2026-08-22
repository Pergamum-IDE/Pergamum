import { createUISFX, type CueName, type PackName, type UISFXPlayer } from "uisfx";
import type { WorkbenchSoundSettings } from "../shared/settings";
import typewriter1Url from "../../assets/sounds/typewriter1.wav?url";
import typewriter2Url from "../../assets/sounds/typewriter2.wav?url";
import typewriter3Url from "../../assets/sounds/typewriter3.wav?url";
import typewriter4Url from "../../assets/sounds/typewriter4.wav?url";
import typewriter5Url from "../../assets/sounds/typewriter5.wav?url";
import typewriter6Url from "../../assets/sounds/typewriter6.wav?url";
import typewriter7Url from "../../assets/sounds/typewriter7.wav?url";
import typewriter8Url from "../../assets/sounds/typewriter8.wav?url";

export interface SoundFeedbackPlayer {
  playDialogSound: () => void;
  playNewlineSound: () => void;
  playKeypressSound: () => void;
}

export type SoundPlaybackFailureHandler = () => void;

export interface AudioElementLike {
  currentTime: number;
  play: () => Promise<void> | void;
}

export type AudioElementFactory = (url: string) => AudioElementLike;

interface BrowserSoundFeedbackPlayerOptions {
  uiPlayer?: Pick<UISFXPlayer, "play">;
  audioElementFactory?: AudioElementFactory;
  onPlaybackFailure?: SoundPlaybackFailureHandler;
  random?: () => number;
  now?: () => number;
  keypressCooldownMs?: number;
}

export type MarkdownEditorInputSoundEvent = "newline" | "keypress";

export const dialogSoundPack = "minimal" satisfies PackName;
export const dialogSoundCue = "mention" satisfies CueName;

export const keypressSoundUrls = [
  typewriter1Url,
  typewriter2Url,
  typewriter3Url,
  typewriter4Url,
  typewriter5Url,
  typewriter6Url,
  typewriter7Url
] as const;

export const newlineSoundUrl = typewriter8Url;

const defaultKeypressCooldownMs = 35;

export const silentSoundFeedbackPlayer: SoundFeedbackPlayer = {
  playDialogSound: () => undefined,
  playNewlineSound: () => undefined,
  playKeypressSound: () => undefined
};

export function canPlayDialogSound(
  settings: WorkbenchSoundSettings
): boolean {
  return settings.enabled && settings.dialog.enabled;
}

export function canPlayNewlineSound(
  settings: WorkbenchSoundSettings
): boolean {
  return settings.enabled && settings.newline.enabled;
}

export function canPlayKeypressSound(
  settings: WorkbenchSoundSettings
): boolean {
  return settings.enabled && settings.keypress.enabled;
}

export function playDialogShownSound(
  player: SoundFeedbackPlayer,
  settings: WorkbenchSoundSettings,
  onPlaybackFailure?: SoundPlaybackFailureHandler
): void {
  if (canPlayDialogSound(settings)) {
    playSafely(() => player.playDialogSound(), onPlaybackFailure);
  }
}

export function playMarkdownEditorInputSound(
  event: MarkdownEditorInputSoundEvent,
  player: SoundFeedbackPlayer,
  settings: WorkbenchSoundSettings,
  onPlaybackFailure?: SoundPlaybackFailureHandler
): void {
  if (event === "newline") {
    if (canPlayNewlineSound(settings)) {
      playSafely(() => player.playNewlineSound(), onPlaybackFailure);
    }
    return;
  }

  if (canPlayKeypressSound(settings)) {
    playSafely(() => player.playKeypressSound(), onPlaybackFailure);
  }
}

function defaultNow(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function defaultAudioElementFactory(url: string): AudioElementLike {
  return new Audio(url);
}

function reportPlaybackFailure(
  onPlaybackFailure?: SoundPlaybackFailureHandler
): void {
  try {
    onPlaybackFailure?.();
  } catch {
    // Sound failure reporting is advisory and must not affect the caller.
  }
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return (
    (typeof value === "object" || typeof value === "function") &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

function handlePlaybackResult(
  result: unknown,
  onPlaybackFailure?: SoundPlaybackFailureHandler
): void {
  if (isPromiseLike(result)) {
    void Promise.resolve(result).catch(() =>
      reportPlaybackFailure(onPlaybackFailure)
    );
  }
}

function playSafely(
  play: () => void,
  onPlaybackFailure?: SoundPlaybackFailureHandler
): void {
  try {
    play();
  } catch {
    reportPlaybackFailure(onPlaybackFailure);
  }
}

function playAudioElement(
  audio: AudioElementLike,
  onPlaybackFailure?: SoundPlaybackFailureHandler
): void {
  try {
    audio.currentTime = 0;
    handlePlaybackResult(audio.play(), onPlaybackFailure);
  } catch {
    reportPlaybackFailure(onPlaybackFailure);
  }
}

export function createBrowserSoundFeedbackPlayer(
  options: BrowserSoundFeedbackPlayerOptions = {}
): SoundFeedbackPlayer {
  let uiPlayer = options.uiPlayer ?? null;
  let lastKeypressPlayedAt = Number.NEGATIVE_INFINITY;
  const audioElementFactory =
    options.audioElementFactory ?? defaultAudioElementFactory;
  const onPlaybackFailure = options.onPlaybackFailure;
  const random = options.random ?? Math.random;
  const now = options.now ?? defaultNow;
  const keypressCooldownMs =
    options.keypressCooldownMs ?? defaultKeypressCooldownMs;

  function getUiPlayer(): Pick<UISFXPlayer, "play"> {
    if (!uiPlayer) {
      uiPlayer = createUISFX({ pack: dialogSoundPack });
    }

    return uiPlayer;
  }

  function playSoundUrl(url: string): void {
    try {
      playAudioElement(audioElementFactory(url), onPlaybackFailure);
    } catch {
      reportPlaybackFailure(onPlaybackFailure);
    }
  }

  return {
    playDialogSound: () => {
      try {
        handlePlaybackResult(
          getUiPlayer().play(dialogSoundCue),
          onPlaybackFailure
        );
      } catch {
        reportPlaybackFailure(onPlaybackFailure);
      }
    },
    playNewlineSound: () => {
      playSoundUrl(newlineSoundUrl);
    },
    playKeypressSound: () => {
      const currentTime = now();

      if (currentTime - lastKeypressPlayedAt < keypressCooldownMs) {
        return;
      }

      lastKeypressPlayedAt = currentTime;
      const index = Math.max(
        0,
        Math.min(
          keypressSoundUrls.length - 1,
          Math.floor(random() * keypressSoundUrls.length)
        )
      );

      playSoundUrl(keypressSoundUrls[index]);
    }
  };
}
