"use client";

/*
 * PlaybackContext —— 播放控制层。
 *
 * 把「当前推荐曲目」交给播放引擎实际播放,并向播放器 UI 暴露统一的
 * 播放态(isPlaying / 进度)和操作(toggle / next / prev / seek)。
 *
 * 数据来源:从 MoodSession 读 recommendations + activeIndex。
 * 引擎:YouTubePlaybackEngine —— 每首歌按「歌名 歌手」经 /api/youtube/search
 * 解析出 videoId 再播放。解析结果在内存里缓存,避免重复消耗 API 配额。
 *
 * 外链跳转不在这里 —— 它是「全网都匹配不到」时的最后兜底,与播放无关。
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
import { useMoodSession } from "@/components/mood-session-provider";
import { YouTubePlaybackEngine } from "@/lib/playback/youtube-engine";
import type { YouTubeSearchResponse } from "@/app/api/youtube/search/route";

/** 当前曲目在播放引擎上的解析状态 */
export type PlaybackStatus = "idle" | "resolving" | "ready" | "error";

interface PlaybackContextValue {
  isPlaying: boolean;
  /** 当前播放位置(秒) */
  positionSec: number;
  /** 当前曲目总时长(秒);未知时为 0 */
  durationSec: number;
  status: PlaybackStatus;
  /** 播放 / 暂停 */
  toggle: () => void;
  /** 下一首 */
  next: () => void;
  /** 上一首 */
  prev: () => void;
  /** 拖动进度,fraction 为 0–1 */
  seekFraction: (fraction: number) => void;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const { recommendations, activeIndex, setActiveIndex } = useMoodSession();

  const [isPlaying, setIsPlaying] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [status, setStatus] = useState<PlaybackStatus>("idle");

  const engineRef = useRef<YouTubePlaybackEngine | null>(null);
  // 「歌名 歌手」→ videoId | null(null 表示搜过但没结果),缓存省配额
  const cacheRef = useRef<Map<string, string | null>>(new Map());
  // 用户是否「想要播放」—— 切歌时据此决定继续播放还是仅 cue
  const wantPlayRef = useRef(false);

  const active = recommendations[activeIndex] ?? null;
  // 当前曲目引用 —— 异步解析回来后用它判断是否已切歌
  const activeRef = useRef(active);
  // 引擎结束回调要调用「最新」的 next —— 用 ref 中转
  const nextRef = useRef<() => void>(() => {});

  // 保持 activeRef 同步(在 effect 里更新,不在 render 期间写 ref)。
  // 声明在 loadActive 的 effect 之前 —— effect 按声明顺序执行,
  // 保证 loadActive 跑之前 activeRef 已是最新。
  useEffect(() => {
    activeRef.current = active;
  });

  /** 懒创建播放引擎并接好回调 */
  const getEngine = useCallback((): YouTubePlaybackEngine => {
    if (!engineRef.current) {
      const engine = new YouTubePlaybackEngine();
      engine.onStateChange = (playing) => setIsPlaying(playing);
      engine.onProgress = (pos, dur) => {
        setPositionSec(pos);
        if (dur > 0) setDurationSec(dur);
      };
      engine.onEnded = () => nextRef.current();
      engine.onError = () => setStatus("error");
      engineRef.current = engine;
    }
    return engineRef.current;
  }, []);

  /** 把「歌名 歌手」解析成 YouTube videoId(带缓存) */
  const resolveVideoId = useCallback(
    async (title: string, artist: string): Promise<string | null> => {
      const q = `${title} ${artist}`.trim();
      const cache = cacheRef.current;
      if (cache.has(q)) return cache.get(q) ?? null;
      try {
        const res = await fetch(
          `/api/youtube/search?q=${encodeURIComponent(q)}`,
        );
        const data = (await res.json()) as YouTubeSearchResponse;
        const id = data.videoId ?? null;
        cache.set(q, id);
        return id;
      } catch {
        return null;
      }
    },
    [],
  );

  /** 解析当前曲目并 cue(或直接播放) */
  const loadActive = useCallback(
    async (forcePlay: boolean) => {
      const a = activeRef.current;
      if (!a) return;
      setStatus("resolving");
      setPositionSec(0);
      setDurationSec(0);
      const videoId = await resolveVideoId(a.title, a.artist);
      if (a !== activeRef.current) return; // 解析期间已切歌,作废
      if (!videoId) {
        setStatus("error");
        return;
      }
      setStatus("ready");
      const engine = getEngine();
      if (forcePlay || wantPlayRef.current) {
        void engine.loadAndPlay(videoId);
      } else {
        void engine.cue(videoId);
      }
    },
    [resolveVideoId, getEngine],
  );

  // 活动曲目变化 → 重新解析(标题+歌手唯一确定一首)
  useEffect(() => {
    if (active) void loadActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.title, active?.artist]);

  const next = useCallback(() => {
    const len = recommendations.length;
    if (len > 0) setActiveIndex((activeIndex + 1) % len);
  }, [recommendations.length, activeIndex, setActiveIndex]);

  const prev = useCallback(() => {
    const len = recommendations.length;
    if (len > 0) setActiveIndex((activeIndex - 1 + len) % len);
  }, [recommendations.length, activeIndex, setActiveIndex]);

  useEffect(() => {
    nextRef.current = next;
  });

  const toggle = useCallback(() => {
    if (isPlaying) {
      wantPlayRef.current = false;
      engineRef.current?.pause();
    } else {
      wantPlayRef.current = true;
      if (status === "ready") {
        getEngine().play();
      } else if (status === "error" || status === "idle") {
        void loadActive(true);
      }
      // status === "resolving":wantPlayRef 已置位,解析完成后会自动播放
    }
  }, [isPlaying, status, loadActive, getEngine]);

  const seekFraction = useCallback(
    (fraction: number) => {
      if (durationSec <= 0) return;
      const clamped = Math.min(1, Math.max(0, fraction));
      engineRef.current?.seek(clamped * durationSec);
      setPositionSec(clamped * durationSec);
    },
    [durationSec],
  );

  // 卸载时释放引擎
  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const value = useMemo<PlaybackContextValue>(
    () => ({
      isPlaying,
      positionSec,
      durationSec,
      status,
      toggle,
      next,
      prev,
      seekFraction,
    }),
    [isPlaying, positionSec, durationSec, status, toggle, next, prev, seekFraction],
  );

  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error("usePlayback must be used within a <PlaybackProvider>");
  }
  return ctx;
}
