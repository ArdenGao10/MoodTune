"use client";

/*
 * PreviewContext —— 30 秒试听层（发现卡片用）。
 *
 * 同一时刻只有一首歌在试听 —— 点别的卡片会自动停掉当前这首。
 * 两种音源，按优先级：
 *  1. Spotify preview_url —— public endpoint，无需登录，用 <audio> 播放。
 *  2. 没有 preview_url → 按「歌名 歌手」搜 YouTube，用 IFrame 引擎播放。
 *     候选视频遇到禁止嵌入 / 下架时自动顺位换下一个（和主播放器同款策略）。
 *  实际播放满 30 秒自动停止。两种来源都失败 → 标记「无 preview」，按钮置灰。
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
import { YouTubePlaybackEngine } from "@/lib/playback/youtube-engine";
import { resolveYouTube } from "@/lib/youtube/resolve";
import type { YouTubeCandidate } from "@/lib/youtube/client";
import type { Track } from "@/lib/types";

/** 试听片段时长上限（秒） */
const PREVIEW_SECONDS = 30;

export type PreviewStatus = "idle" | "loading" | "playing";

interface PreviewContextValue {
  /** 正在试听 / 加载中的 track id；空闲为 null */
  activeId: string | null;
  status: PreviewStatus;
  /** 该 track 经确认没有任何可用试听源 */
  isUnavailable: (trackId: string) => boolean;
  /** 播放 / 暂停某首歌的 30 秒试听 */
  toggle: (track: Track) => void;
  /** 停止当前试听 */
  stop: () => void;
}

const PreviewContext = createContext<PreviewContextValue | null>(null);

export function PreviewProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [unavailable, setUnavailable] = useState<string[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytEngineRef = useRef<YouTubePlaybackEngine | null>(null);
  const ytTimerRef = useRef<number | null>(null);
  const ytCandidatesRef = useRef<YouTubeCandidate[]>([]);
  const ytIdxRef = useRef(0);
  // 正在加载 / 播放的 track id —— 异步回来后据此判断是否已切歌
  const loadingIdRef = useRef<string | null>(null);
  // 引擎报错时调最新的「换下一个候选」逻辑 —— 用 ref 中转
  const ytErrorRef = useRef<() => void>(() => {});

  const markUnavailable = useCallback((id: string) => {
    setUnavailable((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  /** 停掉一切音源，回到空闲态 */
  const stop = useCallback(() => {
    loadingIdRef.current = null;
    if (ytTimerRef.current != null) {
      window.clearTimeout(ytTimerRef.current);
      ytTimerRef.current = null;
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    ytEngineRef.current?.pause();
    setActiveId(null);
    setStatus("idle");
  }, []);

  /** 懒创建 YouTube 引擎（stop / markUnavailable 均为稳定引用，闭包安全） */
  const getYtEngine = useCallback((): YouTubePlaybackEngine => {
    if (!ytEngineRef.current) {
      const engine = new YouTubePlaybackEngine();
      engine.onStateChange = (playing) => {
        if (!playing) return;
        setStatus("playing");
        // 实际开始播放后才计时 —— 满 30 秒停止
        if (ytTimerRef.current != null) window.clearTimeout(ytTimerRef.current);
        ytTimerRef.current = window.setTimeout(stop, PREVIEW_SECONDS * 1000);
      };
      engine.onEnded = () => stop();
      engine.onError = () => ytErrorRef.current();
      ytEngineRef.current = engine;
    }
    return ytEngineRef.current;
  }, [stop]);

  /** 播放候选列表里的第 idx 个；耗尽则判定无 preview */
  const playYtCandidate = useCallback(
    (idx: number) => {
      const list = ytCandidatesRef.current;
      if (idx >= list.length) {
        if (loadingIdRef.current) markUnavailable(loadingIdRef.current);
        stop();
        return;
      }
      ytIdxRef.current = idx;
      void getYtEngine().loadAndPlay(list[idx].videoId);
    },
    [getYtEngine, markUnavailable, stop],
  );

  // 引擎报错 → 静默换下一个候选
  useEffect(() => {
    ytErrorRef.current = () => playYtCandidate(ytIdxRef.current + 1);
  }, [playYtCandidate]);

  /** 用 YouTube 播放 30 秒试听 */
  const playYouTube = useCallback(
    async (track: Track) => {
      loadingIdRef.current = track.id;
      setActiveId(track.id);
      setStatus("loading");

      const candidates = await resolveYouTube(track.title, track.artist);
      // 解析期间用户已切歌 —— 作废
      if (loadingIdRef.current !== track.id) return;
      if (candidates.length === 0) {
        markUnavailable(track.id);
        stop();
        return;
      }
      ytCandidatesRef.current = candidates;
      playYtCandidate(0);
    },
    [markUnavailable, stop, playYtCandidate],
  );

  /** 用 Spotify preview_url 播放（失败回落 YouTube） */
  const playSpotify = useCallback(
    (track: Track) => {
      if (!track.previewUrl) return;
      loadingIdRef.current = track.id;
      setActiveId(track.id);
      setStatus("loading");

      // 每次新建 Audio —— 避免复用旧元素时残留监听器
      const audio = new Audio(track.previewUrl);
      audio.addEventListener("ended", () => stop());
      audio.addEventListener("error", () => {
        // preview 链接挂了 —— 退回 YouTube
        if (loadingIdRef.current === track.id) void playYouTube(track);
      });
      audioRef.current = audio;
      audio
        .play()
        .then(() => {
          if (loadingIdRef.current === track.id) setStatus("playing");
        })
        .catch(() => {
          if (loadingIdRef.current === track.id) void playYouTube(track);
        });
    },
    [stop, playYouTube],
  );

  const toggle = useCallback(
    (track: Track) => {
      // 点正在试听的这首 → 停
      if (activeId === track.id && status !== "idle") {
        stop();
        return;
      }
      stop();
      if (track.previewUrl) playSpotify(track);
      else void playYouTube(track);
    },
    [activeId, status, stop, playSpotify, playYouTube],
  );

  const isUnavailable = useCallback(
    (trackId: string) => unavailable.includes(trackId),
    [unavailable],
  );

  // 卸载时释放资源
  useEffect(() => {
    return () => {
      if (ytTimerRef.current != null) window.clearTimeout(ytTimerRef.current);
      ytEngineRef.current?.destroy();
      ytEngineRef.current = null;
      audioRef.current?.pause();
    };
  }, []);

  const value = useMemo<PreviewContextValue>(
    () => ({ activeId, status, isUnavailable, toggle, stop }),
    [activeId, status, isUnavailable, toggle, stop],
  );

  return (
    <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>
  );
}

export function usePreview(): PreviewContextValue {
  const ctx = useContext(PreviewContext);
  if (!ctx) {
    throw new Error("usePreview must be used within a <PreviewProvider>");
  }
  return ctx;
}
