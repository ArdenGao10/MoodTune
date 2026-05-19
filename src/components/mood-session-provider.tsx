"use client";

/*
 * MoodSessionProvider —— 保存一次「情绪 → 推荐」会话。
 * 在共享 layout 中挂载，因此首页与推荐页之间的客户端跳转不会丢失状态。
 * 首页点击 PLAY 即调用 startRecommendation()，随后跳转到 /recommendations
 * 由该页读取 status / recommendations 渲染（含加载态）。
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useWeather } from "./weather-provider";
import { saveSession } from "@/lib/history";
import { recommendationsToTracks } from "@/lib/track";
import type {
  MoodInput,
  Recommendation,
  RecommendRequest,
  RecommendResponse,
  Track,
} from "@/lib/types";

export type SessionStatus = "idle" | "loading" | "done" | "error";

interface MoodSessionContextValue {
  status: SessionStatus;
  recommendations: Recommendation[];
  /** 统一歌曲模型 —— 发现卡片渲染的数据源（含 Spotify 匹配结果） */
  tracks: Track[];
  activeIndex: number;
  error: string | null;
  startRecommendation: (input: MoodInput) => void;
  setActiveIndex: (index: number) => void;
  retry: () => void;
}

const MoodSessionContext = createContext<MoodSessionContextValue | null>(null);

function friendlyLocalTime(): string {
  return new Date().toLocaleString("en-US", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MoodSessionProvider({ children }: { children: ReactNode }) {
  const { weather } = useWeather();
  const [status, setStatus] = useState<SessionStatus>("idle");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const lastInput = useRef<MoodInput | null>(null);

  const startRecommendation = useCallback(
    (input: MoodInput) => {
      lastInput.current = input;
      setStatus("loading");
      setError(null);
      setRecommendations([]);
      setTracks([]);
      setActiveIndex(0);

      const body: RecommendRequest = {
        ...input,
        weather,
        localTime: friendlyLocalTime(),
      };

      fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then(async (res) => {
          const data = (await res
            .json()
            .catch(() => ({}))) as RecommendResponse;
          if (!res.ok || data.error || !data.recommendations?.length) {
            throw new Error(data.error ?? "The DJ needs a moment. Try again?");
          }
          setRecommendations(data.recommendations);
          // 服务端已匹配 Spotify → 直接用；缺失时用纯推荐兜底
          setTracks(
            data.tracks?.length
              ? data.tracks
              : recommendationsToTracks(data.recommendations),
          );
          setActiveIndex(0);
          setStatus("done");
          // 成功一次推荐 → 存进收听历史(localStorage)
          saveSession(input, data.recommendations);
        })
        .catch((err: unknown) => {
          setError(
            err instanceof Error
              ? err.message
              : "The DJ needs a moment. Try again?",
          );
          setStatus("error");
        });
    },
    [weather],
  );

  const retry = useCallback(() => {
    if (lastInput.current) startRecommendation(lastInput.current);
  }, [startRecommendation]);

  return (
    <MoodSessionContext.Provider
      value={{
        status,
        recommendations,
        tracks,
        activeIndex,
        error,
        startRecommendation,
        setActiveIndex,
        retry,
      }}
    >
      {children}
    </MoodSessionContext.Provider>
  );
}

export function useMoodSession(): MoodSessionContextValue {
  const ctx = useContext(MoodSessionContext);
  if (!ctx) {
    throw new Error(
      "useMoodSession must be used within a <MoodSessionProvider>",
    );
  }
  return ctx;
}
