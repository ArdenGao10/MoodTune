"use client";

/*
 * <HomeStatus /> —— 首页右上角的"此刻时空"状态行。
 *  3 行右对齐：城市+温度 ｜ 本地时间（每分钟更新）｜ 手写体小字。
 */

import { useEffect, useState } from "react";
import { useWeather } from "../weather-provider";

export function HomeStatus() {
  const { weather, status } = useWeather();
  const [time, setTime] = useState<string | null>(null);

  // 实时本地时间，每分钟更新
  useEffect(() => {
    const update = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      setTime(`${hh}:${mm}`);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const cityLine =
    status === "loading"
      ? "Locating…"
      : weather.temp != null
        ? `${weather.city} · ${weather.temp}°`
        : weather.city;

  return (
    <div className="flex flex-col items-end gap-1">
      <span className="text-[12px] font-medium uppercase leading-none tracking-[0.15em] text-mt-fg">
        {cityLine}
      </span>
      <span className="text-[11px] uppercase leading-none tracking-[0.15em] text-mt-muted">
        {time ?? "--:--"} local time
      </span>
      <span className="font-hand text-[14px] leading-none text-mt-muted">
        side b coming soon.
      </span>
    </div>
  );
}
