"use client";

/*
 * PlaybackContext —— 播放控制层。
 *
 * 向播放器 UI 暴露统一的播放态(isPlaying / 进度)和操作
 * (toggle / next / prev / seek)。
 *
 * 数据来源:从 MoodSession 读 recommendations + activeIndex。每首推荐已由
 * /api/recommend 预先解析好 youtubeId(见 lib/youtube),这里直接交给
 * YouTubePlaybackEngine 播放 —— 不再在客户端查询。
 *
 * 自动播放:新一组推荐到达时(进入推荐页),自动开始播放第一首。
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

/** 当前曲目的播放状态 */
export type PlaybackStatus = "idle" | "ready" | "error";

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
  // 用户是否「想要播放」—— 切歌时据此决定继续播放还是仅 cue
  const wantPlayRef = useRef(false);

  const active = recommendations[activeIndex] ?? null;
  // 当前曲目引用 —— 异步回调里用它判断是否已切歌
  const activeRef = useRef(active);
  // 引擎结束回调要调用「最新」的 next —— 用 ref 中转
  const nextRef = useRef<() => void>(() => {});
  // 上一次的 recommendations 引用 —— 用于识别「新一组推荐」
  const prevRecsRef = useRef(recommendations);

  // 同步 activeRef(在 effect 里更新,不在 render 期间写 ref)
  useEffect(() => {
    activeRef.current = active;
  });

  // 新一组推荐到达 → 置「想要播放」,使首曲自动播放
  useEffect(() => {
    if (recommendations !== prevRecsRef.current) {
      prevRecsRef.current = recommendations;
      if (recommendations.length > 0) wantPlayRef.current = true;
    }
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

  /** 加载当前曲目并 cue(或直接播放) */
  const loadActive = useCallback(
    (forcePlay: boolean) => {
      const a = activeRef.current;
      if (!a) return;
      setPositionSec(0);
      setDurationSec(0);
      if (!a.youtubeId) {
        // /api/recommend 没能解析出可播放视频
        setStatus("error");
        return;
      }
      setStatus("ready");
      const engine = getEngine();
      if (forcePlay || wantPlayRef.current) {
        void engine.loadAndPlay(a.youtubeId);
      } else {
        void engine.cue(a.youtubeId);
      }
    },
    [getEngine],
  );

  // 活动曲目变化 → 重新加载
  useEffect(() => {
    if (active) loadActive(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.youtubeId, activeIndex]);

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
      } else {
        loadActive(true);
      }
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
