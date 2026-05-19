"use client";

/*
 * SpotifyPlaybackContext —— Spotify Web Playback SDK 集成（Premium 增强）。
 *
 * 「发现层」的默认体验是 30s 试听 + 跨平台跳转；这一层是给已登录的 Premium
 * 用户的加料：在浏览器里直接全曲播放。
 *
 * 只有 Premium 用户挂载时才加载 SDK 脚本、注册一个浏览器播放设备。
 * 全曲播放走 PUT /api/me/player（在该设备上 play 指定 track uri）。
 * 非 Premium / 未登录 → ready 恒为 false，UI 不显示 Full Play 按钮。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useMusicSource } from "@/contexts/MusicSourceContext";
import type { SpotifyTokenRouteResponse } from "@/app/api/auth/spotify/token/route";
import type { Track } from "@/lib/types";

/* ---------- Web Playback SDK 的最小类型声明 ---------- */

interface SpotifyPlaybackState {
  paused: boolean;
  track_window: { current_track: { uri: string } };
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, cb: (payload: unknown) => void): boolean;
  togglePlay(): Promise<void>;
}

interface SpotifyNamespace {
  Player: new (opts: {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }) => SpotifyPlayer;
}

declare global {
  interface Window {
    Spotify?: SpotifyNamespace;
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

const SDK_SRC = "https://sdk.scdn.co/spotify-player.js";

interface SpotifyPlaybackContextValue {
  /** SDK 设备已注册就绪 —— 仅此时 Full Play 可用 */
  ready: boolean;
  /** SDK 设备当前在播的 track uri */
  activeUri: string | null;
  isPlaying: boolean;
  /** 全曲播放某首歌（需 track.spotifyUri） */
  playFull: (track: Track) => void;
  /** 暂停 / 继续当前全曲播放 */
  toggle: () => void;
}

const SpotifyPlaybackContext =
  createContext<SpotifyPlaybackContextValue | null>(null);

/** 加载一次 SDK 脚本，resolve 于 window.Spotify 就绪 */
let sdkPromise: Promise<void> | null = null;
function loadSpotifySdk(): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve) => {
    if (window.Spotify) {
      resolve();
      return;
    }
    const prev = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = SDK_SRC;
    document.head.appendChild(tag);
  });
  return sdkPromise;
}

export function SpotifyPlaybackProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isPremium } = useMusicSource();

  const [ready, setReady] = useState(false);
  const [activeUri, setActiveUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playerRef = useRef<SpotifyPlayer | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  // Premium 用户挂载 → 初始化 SDK（仅一次）
  useEffect(() => {
    if (!isPremium || playerRef.current) return;
    let cancelled = false;

    void loadSpotifySdk().then(() => {
      if (cancelled || !window.Spotify || playerRef.current) return;
      const player = new window.Spotify.Player({
        name: "MoodTune",
        volume: 0.6,
        getOAuthToken: (cb) => {
          fetch("/api/auth/spotify/token")
            .then((r) => r.json() as Promise<SpotifyTokenRouteResponse>)
            .then((d) => {
              if (d.token) cb(d.token);
            })
            .catch(() => {});
        },
      });
      player.addListener("ready", (payload) => {
        deviceIdRef.current = (payload as { device_id: string }).device_id;
        setReady(true);
      });
      player.addListener("not_ready", () => setReady(false));
      player.addListener("player_state_changed", (payload) => {
        const state = payload as SpotifyPlaybackState | null;
        if (!state) return;
        setIsPlaying(!state.paused);
        setActiveUri(state.track_window.current_track.uri);
      });
      player.addListener("authentication_error", () => setReady(false));
      player.addListener("account_error", () => setReady(false));
      void player.connect();
      playerRef.current = player;
    });

    return () => {
      cancelled = true;
    };
  }, [isPremium]);

  // 卸载时断开
  useEffect(() => {
    return () => {
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, []);

  const playFull = useCallback((track: Track) => {
    const deviceId = deviceIdRef.current;
    if (!deviceId || !track.spotifyUri) return;
    // 乐观更新 —— SDK 的 player_state_changed 随后校正
    setActiveUri(track.spotifyUri);
    setIsPlaying(true);
    fetch("/api/me/player", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uri: track.spotifyUri, deviceId }),
    }).catch(() => {
      setIsPlaying(false);
    });
  }, []);

  const toggle = useCallback(() => {
    void playerRef.current?.togglePlay();
  }, []);

  const value = useMemo<SpotifyPlaybackContextValue>(
    () => ({ ready, activeUri, isPlaying, playFull, toggle }),
    [ready, activeUri, isPlaying, playFull, toggle],
  );

  return (
    <SpotifyPlaybackContext.Provider value={value}>
      {children}
    </SpotifyPlaybackContext.Provider>
  );
}

export function useSpotifyPlayback(): SpotifyPlaybackContextValue {
  const ctx = useContext(SpotifyPlaybackContext);
  if (!ctx) {
    throw new Error(
      "useSpotifyPlayback must be used within a <SpotifyPlaybackProvider>",
    );
  }
  return ctx;
}
