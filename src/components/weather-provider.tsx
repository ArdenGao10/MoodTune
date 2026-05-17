"use client";

/*
 * WeatherProvider —— 三层降级定位 + 天气。
 *  - 缓存优先：有缓存先用它即时渲染。
 *  - 自动定位（浏览器 → IP）作为后台更新；手动选择的缓存不被自动覆盖。
 *  - 两层都失败且无缓存 → status "needs-location"，由 widget 引导手动选择。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getCachedLocation,
  getLocation,
  setManualLocation,
  type LocationResult,
} from "@/lib/location";
import type { Weather } from "@/lib/types";

type WeatherStatus = "loading" | "ready" | "needs-location";

interface WeatherContextValue {
  weather: Weather;
  status: WeatherStatus;
  /** 手动设定城市（预置名或自由输入）；失败时抛错供调用方提示 */
  setCity: (city: string) => Promise<void>;
}

const FALLBACK: Weather = { city: "Somewhere, Earth", temp: null, condition: "" };

const WeatherContext = createContext<WeatherContextValue | null>(null);

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [weather, setWeather] = useState<Weather>(FALLBACK);
  const [status, setStatus] = useState<WeatherStatus>("loading");

  // 给定坐标 → 拉天气 → 更新状态
  const applyLocation = useCallback(async (loc: LocationResult) => {
    try {
      const res = await fetch(`/api/weather?lat=${loc.lat}&lon=${loc.lon}`);
      const w = (await res.json()) as Weather;
      // 天气接口返回的城市名优先；缺失时退回定位给出的名字
      const city =
        w.city && w.city !== FALLBACK.city ? w.city : loc.city || w.city;
      setWeather({ ...w, city });
    } catch {
      setWeather({
        city: loc.city || FALLBACK.city,
        temp: null,
        condition: "",
      });
    }
    setStatus("ready");
  }, []);

  // 挂载：缓存优先 + 后台自动定位
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = getCachedLocation();
      if (cached) {
        await applyLocation(cached);
        // 手动选择是明确意图 —— 不被自动定位覆盖
        if (cached.source === "manual") return;
      }
      try {
        const loc = await getLocation();
        if (!cancelled) await applyLocation(loc);
      } catch {
        // 浏览器 + IP 都失败：无缓存则引导手动选择
        if (!cancelled && !cached) setStatus("needs-location");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyLocation]);

  const setCity = useCallback(
    async (city: string) => {
      setStatus("loading");
      try {
        const loc = await setManualLocation(city);
        await applyLocation(loc);
      } catch (err) {
        setStatus("needs-location");
        throw err;
      }
    },
    [applyLocation],
  );

  return (
    <WeatherContext.Provider value={{ weather, status, setCity }}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather(): WeatherContextValue {
  const ctx = useContext(WeatherContext);
  if (!ctx) {
    throw new Error("useWeather must be used within a <WeatherProvider>");
  }
  return ctx;
}
