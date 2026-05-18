"use client";

/*
 * PlaybackContext —— 播放控制层。
 *
 * 向播放器 UI 暴露统一的播放态(isPlaying / 进度 / 专辑封面)和操作
 * (toggle / next / prev / seek)。
 *
 * 数据来源:从 MoodSession 读 recommendations + activeIndex。
 * 解析:某首歌成为「当前曲目」时,才按「歌名 歌手」经 /api/youtube/search
 * 解析出一组候选视频。先播第一个候选;若引擎报错(禁止嵌入 / 地区限制 /
 * 已下架),静默顺位换下一个候选 —— 显著减少「Couldn't find」。
 * 解析结果在内存里缓存,避免重复消耗 API 配额。
 *
 * 自动播放:新一组推荐到达(进入推荐页)时,自动开始播放第一首。
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
import { updateLatestSessionCover } from "@/lib/history";
import { YouTubePlaybackEngine } from "@/lib/playback/youtube-engine";
import type { YouTubeCandidate } from "@/lib/youtube/client";
import type { YouTubeSearchResponse } from "@/app/api/youtube/search/route";

/** 当前曲目的解析 / 播放状态 */
export type PlaybackStatus = "idle" | "resolving" | "ready" | "error";

interface PlaybackContextValue {
  isPlaying: boolean;
  /** 当前播放位置(秒) */
  positionSec: number;
  /** 当前曲目总时长(秒);未知时为 0 */
  durationSec: number;
  status: PlaybackStatus;
  /** 当前曲目的专辑封面(取自匹配视频的缩略图);未解析到时为 null */
  albumArtUrl: string | null;
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
  const [albumArtUrl, setAlbumArtUrl] = useState<string | null>(null);

  const engineRef = useRef<YouTubePlaybackEngine | null>(null);
  // 「歌名 歌手」→ 候选列表,缓存省配额(只缓存非空结果,失败可重试)
  const cacheRef = useRef<Map<string, YouTubeCandidate[]>>(new Map());
  // 用户是否「想要播放」—— 切歌时据此决定继续播放还是仅 cue
  const wantPlayRef = useRef(false);
  // 当前曲目的候选列表 + 正在用第几个
  const candidatesRef = useRef<YouTubeCandidate[]>([]);
  const candidateIdxRef = useRef(0);
  // 新一组推荐后,下一次解析成功时把头号曲的封面回填进历史记录
  const captureCoverRef = useRef(false);

  const active = recommendations[activeIndex] ?? null;
  // 当前曲目引用 —— 异步解析回来后用它判断是否已切歌
  const activeRef = useRef(active);
  // 引擎回调要调用「最新」的处理函数 —— 用 ref 中转
  const nextRef = useRef<() => void>(() => {});
  const errorRef = useRef<() => void>(() => {});
  // 上一次的 recommendations 引用 —— 用于识别「新一组推荐」
  const prevRecsRef = useRef(recommendations);

  // 同步 activeRef(在 effect 里更新,不在 render 期间写 ref)。
  // 声明在 loadActive 的 effect 之前 —— effect 按声明顺序执行。
  useEffect(() => {
    activeRef.current = active;
  });

  // 新一组推荐到达 → 置「想要播放」,使首曲自动播放
  useEffect(() => {
    if (recommendations !== prevRecsRef.current) {
      prevRecsRef.current = recommendations;
      if (recommendations.length > 0) {
        wantPlayRef.current = true;
        captureCoverRef.current = true;
      }
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
      engine.onError = () => errorRef.current();
      engineRef.current = engine;
    }
    return engineRef.current;
  }, []);

  /** 播放候选列表里的第 idx 个 */
  const playCandidate = useCallback(
    (idx: number) => {
      const list = candidatesRef.current;
      if (idx < 0 || idx >= list.length) {
        setStatus("error");
        return;
      }
      candidateIdxRef.current = idx;
      const candidate = list[idx];
      setAlbumArtUrl(candidate.thumbnailUrl || null);
      setStatus("ready");
      const engine = getEngine();
      if (wantPlayRef.current) void engine.loadAndPlay(candidate.videoId);
      else void engine.cue(candidate.videoId);
    },
    [getEngine],
  );

  /** 引擎报错 → 静默换下一个候选;候选耗尽才算失败 */
  const handleEngineError = useCallback(() => {
    const nextIdx = candidateIdxRef.current + 1;
    if (nextIdx < candidatesRef.current.length) {
      playCandidate(nextIdx);
    } else {
      setStatus("error");
    }
  }, [playCandidate]);

  useEffect(() => {
    errorRef.current = handleEngineError;
  });

  /** 把「歌名 歌手」解析成候选列表(带缓存,只缓存非空结果) */
  const resolveTrack = useCallback(
    async (title: string, artist: string): Promise<YouTubeCandidate[]> => {
      const q = `${title} ${artist}`.trim();
      const cache = cacheRef.current;
      const cached = cache.get(q);
      if (cached) return cached;
      try {
        const res = await fetch(
          `/api/youtube/search?q=${encodeURIComponent(q)}`,
        );
        const data = (await res.json()) as YouTubeSearchResponse;
        const candidates = data.candidates ?? [];
        if (candidates.length > 0) cache.set(q, candidates);
        return candidates;
      } catch {
        return [];
      }
    },
    [],
  );

  /** 解析当前曲目并从第一个候选开始播放 / cue */
  const loadActive = useCallback(
    async (forcePlay: boolean) => {
      const a = activeRef.current;
      if (!a) return;
      setStatus("resolving");
      setPositionSec(0);
      setDurationSec(0);
      setAlbumArtUrl(null);
      candidatesRef.current = [];
      candidateIdxRef.current = 0;
      const candidates = await resolveTrack(a.title, a.artist);
      if (a !== activeRef.current) return; // 解析期间已切歌,作废
      if (candidates.length === 0) {
        setStatus("error");
        return;
      }
      candidatesRef.current = candidates;
      // 新一组推荐的头号曲解析成功 → 把封面回填进历史日历
      if (captureCoverRef.current) {
        captureCoverRef.current = false;
        if (candidates[0]?.thumbnailUrl) {
          updateLatestSessionCover(candidates[0].thumbnailUrl);
        }
      }
      if (forcePlay) wantPlayRef.current = true;
      playCandidate(0);
    },
    [resolveTrack, playCandidate],
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
      albumArtUrl,
      toggle,
      next,
      prev,
      seekFraction,
    }),
    [
      isPlaying,
      positionSec,
      durationSec,
      status,
      albumArtUrl,
      toggle,
      next,
      prev,
      seekFraction,
    ],
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
