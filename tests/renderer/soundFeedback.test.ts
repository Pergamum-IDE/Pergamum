import { describe, expect, it, vi } from "vitest";
import {
  canPlayDialogSound,
  canPlayKeypressSound,
  canPlayNewlineSound,
  createBrowserSoundFeedbackPlayer,
  dialogSoundCue,
  dialogSoundPack,
  keypressSoundUrls,
  newlineSoundUrl,
  playDialogShownSound,
  playMarkdownEditorInputSound,
  type AudioElementFactory,
  type SoundFeedbackPlayer
} from "../../src/renderer/soundFeedback";
import type { WorkbenchSoundSettings } from "../../src/shared/settings";

function soundSettings(
  overrides: Partial<WorkbenchSoundSettings> = {}
): WorkbenchSoundSettings {
  return {
    enabled: true,
    dialog: { enabled: true },
    newline: { enabled: true },
    keypress: { enabled: true },
    ...overrides
  };
}

function fakePlayer(): SoundFeedbackPlayer {
  return {
    playDialogSound: vi.fn(),
    playNewlineSound: vi.fn(),
    playKeypressSound: vi.fn()
  };
}

describe("sound feedback enablement gates (#200)", () => {
  it("requires both the global sound setting and dialog child setting for dialog display sounds", () => {
    expect(canPlayDialogSound(soundSettings())).toBe(true);
    expect(canPlayDialogSound(soundSettings({ enabled: false }))).toBe(false);
    expect(
      canPlayDialogSound(soundSettings({ dialog: { enabled: false } }))
    ).toBe(false);
  });

  it("requires both the global sound setting and the corresponding editor child setting for editor sounds", () => {
    expect(canPlayNewlineSound(soundSettings())).toBe(true);
    expect(canPlayKeypressSound(soundSettings())).toBe(true);
    expect(canPlayNewlineSound(soundSettings({ enabled: false }))).toBe(false);
    expect(canPlayKeypressSound(soundSettings({ enabled: false }))).toBe(false);
    expect(
      canPlayNewlineSound(soundSettings({ newline: { enabled: false } }))
    ).toBe(false);
    expect(
      canPlayKeypressSound(soundSettings({ keypress: { enabled: false } }))
    ).toBe(false);
  });

  it("plays dialog and editor sounds only when their setting gates allow it", () => {
    const player = fakePlayer();

    playDialogShownSound(player, soundSettings());
    playDialogShownSound(player, soundSettings({ enabled: false }));
    playMarkdownEditorInputSound("newline", player, soundSettings());
    playMarkdownEditorInputSound(
      "newline",
      player,
      soundSettings({ newline: { enabled: false } })
    );
    playMarkdownEditorInputSound("keypress", player, soundSettings());
    playMarkdownEditorInputSound(
      "keypress",
      player,
      soundSettings({ keypress: { enabled: false } })
    );

    expect(player.playDialogSound).toHaveBeenCalledTimes(1);
    expect(player.playNewlineSound).toHaveBeenCalledTimes(1);
    expect(player.playKeypressSound).toHaveBeenCalledTimes(1);
  });

  it("treats player playback exceptions as advisory and reports failures", () => {
    const onPlaybackFailure = vi.fn();
    const player: SoundFeedbackPlayer = {
      playDialogSound: vi.fn(() => {
        throw new Error("dialog sound failed");
      }),
      playNewlineSound: vi.fn(() => {
        throw new Error("newline sound failed");
      }),
      playKeypressSound: vi.fn(() => {
        throw new Error("keypress sound failed");
      })
    };

    expect(() =>
      playDialogShownSound(player, soundSettings(), onPlaybackFailure)
    ).not.toThrow();
    expect(() =>
      playMarkdownEditorInputSound(
        "newline",
        player,
        soundSettings(),
        onPlaybackFailure
      )
    ).not.toThrow();
    expect(() =>
      playMarkdownEditorInputSound(
        "keypress",
        player,
        soundSettings(),
        onPlaybackFailure
      )
    ).not.toThrow();

    expect(onPlaybackFailure).toHaveBeenCalledTimes(3);
  });
});

describe("browser sound feedback player (#200)", () => {
  it("uses the uisfx minimal pack mention cue for dialog display sounds", () => {
    const play = vi.fn(() => null);
    const player = createBrowserSoundFeedbackPlayer({
      uiPlayer: { play }
    });

    player.playDialogSound();

    expect(dialogSoundPack).toBe("minimal");
    expect(dialogSoundCue).toBe("mention");
    expect(play).toHaveBeenCalledWith("mention");
  });

  it("reports dialog sound failures without throwing", () => {
    const onPlaybackFailure = vi.fn();
    const play = vi.fn(() => {
      throw new Error("dialog sound unavailable");
    });
    const player = createBrowserSoundFeedbackPlayer({
      uiPlayer: { play },
      onPlaybackFailure
    });

    expect(() => player.playDialogSound()).not.toThrow();

    expect(onPlaybackFailure).toHaveBeenCalledTimes(1);
  });

  it("uses typewriter8.wav for newline sounds without playing real audio in tests", () => {
    const playedUrls: string[] = [];
    const audioElementFactory: AudioElementFactory = (url) => {
      playedUrls.push(url);
      return { currentTime: 10, play: vi.fn(() => Promise.resolve()) };
    };
    const player = createBrowserSoundFeedbackPlayer({ audioElementFactory });

    player.playNewlineSound();

    expect(playedUrls).toEqual([newlineSoundUrl]);
    expect(newlineSoundUrl).toContain("typewriter8.wav");
  });

  it("reports audio element creation and playback failures without throwing", async () => {
    const onPlaybackFailure = vi.fn();
    const rejectedPlayback = vi.fn(() =>
      Promise.reject(new Error("audio playback failed"))
    );
    const playbackRejectingPlayer = createBrowserSoundFeedbackPlayer({
      audioElementFactory: () => ({
        currentTime: 10,
        play: rejectedPlayback
      }),
      onPlaybackFailure
    });

    expect(() => playbackRejectingPlayer.playNewlineSound()).not.toThrow();
    await Promise.resolve();

    const creationThrowingPlayer = createBrowserSoundFeedbackPlayer({
      audioElementFactory: () => {
        throw new Error("audio element failed");
      },
      onPlaybackFailure
    });

    expect(() => creationThrowingPlayer.playNewlineSound()).not.toThrow();

    expect(onPlaybackFailure).toHaveBeenCalledTimes(2);
  });

  it("uses typewriter1-7.wav for keypress sounds and throttles continuous playback", () => {
    const playedUrls: string[] = [];
    let currentTime = 100;
    const audioElementFactory: AudioElementFactory = (url) => {
      playedUrls.push(url);
      return { currentTime: 10, play: vi.fn(() => undefined) };
    };
    const player = createBrowserSoundFeedbackPlayer({
      audioElementFactory,
      random: () => 0.99,
      now: () => currentTime,
      keypressCooldownMs: 35
    });

    player.playKeypressSound();
    player.playKeypressSound();
    currentTime += 35;
    player.playKeypressSound();

    expect(playedUrls).toEqual([keypressSoundUrls[6], keypressSoundUrls[6]]);
    expect(playedUrls[0]).toContain("typewriter7.wav");
    expect(keypressSoundUrls).toHaveLength(7);
  });
});
