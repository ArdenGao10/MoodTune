"use client";

/*
 * <WeatherWidget /> —— 顶栏天气 + 定位选择。
 *  loading：显示 "..."
 *  ready：天气图标 + 温度 + 城市（点击可改）
 *  needs-location：地点图标 + "Set location"，点击弹出城市选择
 */

import { useEffect, useRef, useState } from "react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  MapPin,
  Sun,
} from "lucide-react";
import { PRESET_CITY_NAMES } from "@/lib/location";
import { useWeather } from "../weather-provider";

// 根据 OpenWeatherMap 的 condition 渲染对应图标
function WeatherIcon({ condition }: { condition: string }) {
  const props = {
    className: "size-4 shrink-0",
    strokeWidth: 1.5,
    "aria-hidden": true,
  } as const;
  switch (condition) {
    case "Clear":
      return <Sun {...props} />;
    case "Clouds":
      return <Cloud {...props} />;
    case "Rain":
    case "Drizzle":
      return <CloudRain {...props} />;
    case "Snow":
      return <CloudSnow {...props} />;
    case "Thunderstorm":
      return <CloudLightning {...props} />;
    case "Mist":
    case "Fog":
    case "Haze":
      return <CloudFog {...props} />;
    default:
      return <CloudSun {...props} />;
  }
}

export function WeatherWidget() {
  const { weather, status, setCity } = useWeather();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"list" | "other">("list");
  const [cityInput, setCityInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部 / Esc 关闭
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function choose(city: string) {
    if (!city.trim() || submitting) return;
    setSubmitting(true);
    setPickError(null);
    try {
      await setCity(city);
      setOpen(false);
      setMode("list");
      setCityInput("");
    } catch {
      setPickError("Couldn't find that city");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Weather and location"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-mt-muted transition-colors hover:text-mt-fg"
      >
        {status === "loading" && (
          <span className="text-[13px] font-medium tracking-[0.1em] text-mt-fg">
            ...
          </span>
        )}

        {status === "needs-location" && (
          <>
            <MapPin
              className="size-4 shrink-0"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span className="text-eyebrow">Set location</span>
          </>
        )}

        {status === "ready" && (
          <>
            <WeatherIcon condition={weather.condition} />
            <span className="flex flex-col items-start leading-none">
              <span className="text-[13px] font-medium tabular-nums text-mt-fg">
                {weather.temp != null ? `${weather.temp}°` : "--°"}
              </span>
              <span className="max-w-[120px] truncate text-[9px] font-medium uppercase tracking-[0.15em]">
                {weather.city}
              </span>
            </span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-56 rounded-xl border border-mt-stroke bg-mt-bg p-3 shadow-2xl">
          <p className="text-eyebrow mb-2 px-1 text-mt-muted">Set location</p>

          {mode === "list" ? (
            <div className="flex flex-col">
              {PRESET_CITY_NAMES.map((city) => (
                <button
                  key={city}
                  type="button"
                  disabled={submitting}
                  onClick={() => choose(city)}
                  className="rounded-lg px-2 py-2 text-left text-[13px] text-mt-fg transition-colors hover:bg-mt-stroke/25 disabled:opacity-50"
                >
                  {city}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMode("other");
                  setPickError(null);
                }}
                className="rounded-lg px-2 py-2 text-left text-[13px] italic text-mt-muted transition-colors hover:bg-mt-stroke/25 hover:text-mt-fg"
              >
                Other…
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                choose(cityInput);
              }}
            >
              <input
                type="text"
                autoFocus
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Type a city…"
                aria-label="City name"
                className="w-full border-b border-mt-stroke bg-transparent py-2 text-[14px] text-mt-fg placeholder:italic placeholder:text-mt-faint focus:border-mt-strong focus:outline-none"
              />
              <div className="mt-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setMode("list");
                    setPickError(null);
                  }}
                  className="text-eyebrow text-mt-muted hover:text-mt-fg"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || !cityInput.trim()}
                  className="rounded-full border border-mt-strong px-4 py-1.5 text-eyebrow text-mt-fg transition-colors hover:bg-mt-fg hover:text-mt-bg disabled:opacity-40"
                >
                  {submitting ? "…" : "Set"}
                </button>
              </div>
            </form>
          )}

          {pickError && (
            <p className="mt-2 px-1 text-[11px] text-mt-muted">{pickError}</p>
          )}
        </div>
      )}
    </div>
  );
}
