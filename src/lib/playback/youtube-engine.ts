/*
 * YouTubePlaybackEngine —— 用 YouTube IFrame Player API 当音频引擎。
 *
 * 播放器 iframe 被放到屏幕外(不可见),只取它的音频;用户看到、操作的是
 * MoodTune 自己的黑胶播放器 UI。引擎只负责「出声」+ 上报状态/进度。
 *
 * IFrame API 没有进度事件 —— 播放中用 setInterval 轮询 getCurrentTime()。
 */

import type { PlaybackEngine } from "./types";

/* ---------- YouTube IFrame API 的最小类型声明 ---------- */

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  loadVideoById(videoId: string): void;
  cueVideoById(videoId: string): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}

interface YTPlayerEvent {
  data: number;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      playerVars?: Record<string, unknown>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: YTPlayerEvent) => void;
        onError?: (e: YTPlayerEvent) => void;
      };
    },
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

/* ---------- IFrame API 脚本加载(全局一次) ---------- */

let apiPromise: Promise<void> | null = null;

function loadYouTubeIframeApi(): Promise<void> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    // YouTube 脚本就绪后会调用这个全局回调
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

/* ---------- IFrame Player 的状态码 ---------- */
const YT_ENDED = 0;
const YT_PLAYING = 1;
const YT_PAUSED = 2;

export class YouTubePlaybackEngine implements PlaybackEngine {
  private player: YTPlayer | null = null;
  private readyPromise: Promise<void> | null = null;
  private container: HTMLDivElement | null = null;
  private progressTimer: number | null = null;

  onStateChange: (playing: boolean) => void = () => {};
  onProgress: (positionSec: number, durationSec: number) => void = () => {};
  onEnded: () => void = () => {};
  onError: (code: number) => void = () => {};

  /** 首次调用时加载 API、创建屏幕外播放器;后续直接复用 */
  private ensureReady(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    this.readyPromise = (async () => {
      await loadYouTubeIframeApi();

      // 屏幕外容器 —— 给足尺寸(YT 播放器太小会异常),但移出视口
      const container = document.createElement("div");
      container.setAttribute("aria-hidden", "true");
      Object.assign(container.style, {
        position: "fixed",
        left: "-9999px",
        top: "0",
        width: "320px",
        height: "180px",
        pointerEvents: "none",
      });
      const mount = document.createElement("div");
      container.appendChild(mount);
      document.body.appendChild(container);
      this.container = container;

      await new Promise<void>((resolve) => {
        // YT.Player 的方法(playVideo 等)要到 onReady 才可用 —— 在 onReady
        // 里才把实例挂到 this.player,保证「this.player 非空 == 已就绪」。
        const player = new window.YT!.Player(mount, {
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              this.player = player;
              resolve();
            },
            onStateChange: (e) => this.handleStateChange(e.data),
            onError: (e) => this.onError(e.data),
          },
        });
      });
    })();
    return this.readyPromise;
  }

  private handleStateChange(state: number): void {
    if (state === YT_PLAYING) {
      this.onStateChange(true);
      this.startProgressPolling();
    } else if (state === YT_PAUSED) {
      this.onStateChange(false);
      this.stopProgressPolling();
    } else if (state === YT_ENDED) {
      this.onStateChange(false);
      this.stopProgressPolling();
      this.onEnded();
    }
    // 缓冲(3)/已 cue(5)/未开始(-1):不翻转播放态
  }

  private startProgressPolling(): void {
    this.stopProgressPolling();
    this.progressTimer = window.setInterval(() => {
      if (!this.player) return;
      this.onProgress(
        this.player.getCurrentTime() || 0,
        this.player.getDuration() || 0,
      );
    }, 500);
  }

  private stopProgressPolling(): void {
    if (this.progressTimer != null) {
      window.clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  async cue(videoId: string): Promise<void> {
    await this.ensureReady();
    this.player!.cueVideoById(videoId);
  }

  async loadAndPlay(videoId: string): Promise<void> {
    await this.ensureReady();
    this.player!.loadVideoById(videoId); // loadVideoById 会自动开始播放
  }

  /** 同步恢复播放 —— 保留点击手势上下文,避免被浏览器自动播放策略拦截 */
  play(): void {
    if (this.player) {
      this.player.playVideo();
      return;
    }
    void this.ensureReady().then(() => this.player?.playVideo());
  }

  pause(): void {
    this.player?.pauseVideo();
  }

  seek(seconds: number): void {
    this.player?.seekTo(Math.max(0, seconds), true);
  }

  destroy(): void {
    this.stopProgressPolling();
    this.player?.destroy();
    this.player = null;
    this.container?.remove();
    this.container = null;
    this.readyPromise = null;
  }
}
