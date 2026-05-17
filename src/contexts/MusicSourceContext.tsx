"use client";

/*
 * MusicSourceContext —— 数据来源的统一抽象层。
 *
 * 让上层 UI 不关心歌曲从哪来：
 *  - Demo Mode（默认 / 未登录 / 非 Premium）：getRecommendations() 直接
 *    从 mock 池随机抽 3 首，整条「情绪 → 推荐 → 播放列表」流程都能走通。
 *  - Real Mode（已登录且 product === 'premium'）：getRecommendations()
 *    走 /api/recommend —— GLM 出 3 首歌、再匹配 Spotify，返回统一 Track[]。
 *
 * mode 判定：挂载时拉 /api/me，cookie 有有效 access_token 且
 * user.product === 'premium' → real，否则 demo。
 *
 * 注意：本阶段只搭数据层，不接 UI。Provider 已挂在 layout 里，但页面仍由
 * 既有的 MoodSessionProvider 驱动 —— UI 切换留到下一阶段。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useWeather } from "@/components/weather-provider";
import { pickMockTracks } from "@/lib/mock/tracks";
import type { MeResponse, SpotifyUser } from "@/lib/spotify/types";
import type {
  MoodInput,
  RecommendRequest,
  RecommendResponse,
  Track,
} from "@/lib/types";

export type MusicMode = "demo" | "real";

interface MusicSourceContextValue {
  mode: MusicMode;
  user: SpotifyUser | null;
  isPremium: boolean;
  /** /api/me 是否已返回 —— 临时测试按钮据此避免首帧闪烁 */
  ready: boolean;
  /** 跳转 Spotify OAuth */
  login: () => void;
  logout: () => void;
  getRecommendations: (moodInput: MoodInput) => Promise<Track[]>;
}

const MusicSourceContext = createContext<MusicSourceContextValue | null>(null);

function friendlyLocalTime(): string {
  return new Date().toLocaleString("en-US", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MusicSourceProvider({ children }: { children: ReactNode }) {
  const { weather } = useWeather();
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [ready, setReady] = useState(false);

  // 挂载时确认登录态
  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((res) => res.json() as Promise<MeResponse>)
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isPremium = user?.product === "premium";
  // 登录但非 Premium 也回落 Demo —— 真实播放需要 Premium
  const mode: MusicMode = user && isPremium ? "real" : "demo";

  const login = useCallback(() => {
    window.location.href = "/api/auth/spotify/login";
  }, []);

  const logout = useCallback(() => {
    fetch("/api/auth/spotify/logout", { method: "POST" })
      .catch(() => {})
      .finally(() => setUser(null));
  }, []);

  const getRecommendations = useCallback(
    async (moodInput: MoodInput): Promise<Track[]> => {
      // Demo Mode：跳过 GLM 与 Spotify，直接给 3 首 mock
      if (mode === "demo") {
        return pickMockTracks(3);
      }

      // Real Mode：GLM 推荐 + Spotify 匹配（都在服务端完成）
      const body: RecommendRequest = {
        ...moodInput,
        weather,
        localTime: friendlyLocalTime(),
      };
      try {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res
          .json()
          .catch(() => ({}))) as RecommendResponse;
        if (res.ok && data.tracks?.length) {
          return data.tracks;
        }
        console.warn("getRecommendations: no tracks returned, falling back to mock");
      } catch (error) {
        console.warn("getRecommendations: request failed, falling back to mock", error);
      }
      // 真实模式失败兜底 —— 保证流程永不中断
      return pickMockTracks(3);
    },
    [mode, weather],
  );

  const value = useMemo<MusicSourceContextValue>(
    () => ({
      mode,
      user,
      isPremium,
      ready,
      login,
      logout,
      getRecommendations,
    }),
    [mode, user, isPremium, ready, login, logout, getRecommendations],
  );

  return (
    <MusicSourceContext.Provider value={value}>
      {children}
    </MusicSourceContext.Provider>
  );
}

export function useMusicSource(): MusicSourceContextValue {
  const ctx = useContext(MusicSourceContext);
  if (!ctx) {
    throw new Error(
      "useMusicSource must be used within a <MusicSourceProvider>",
    );
  }
  return ctx;
}
