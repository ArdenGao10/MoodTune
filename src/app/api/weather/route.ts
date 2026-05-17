/*
 * GET /api/weather?lat=&lon= —— OpenWeatherMap 代理。
 * API key 留在服务端。任何失败都降级为 "Somewhere, Earth"。
 */

import { NextResponse } from "next/server";
import type { Weather } from "@/lib/types";

export const runtime = "nodejs";

const FALLBACK: Weather = { city: "Somewhere, Earth", temp: null, condition: "" };

export async function GET(req: Request): Promise<NextResponse<Weather>> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (!apiKey || !lat || !lon) {
    return NextResponse.json(FALLBACK);
  }

  try {
    const url =
      `https://api.openweathermap.org/data/2.5/weather` +
      `?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}` +
      `&units=metric&appid=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`OpenWeatherMap ${res.status}`);

    const data = await res.json();
    const weather: Weather = {
      city: typeof data.name === "string" && data.name ? data.name : FALLBACK.city,
      temp:
        typeof data.main?.temp === "number" ? Math.round(data.main.temp) : null,
      condition:
        typeof data.weather?.[0]?.main === "string" ? data.weather[0].main : "",
      icon: typeof data.weather?.[0]?.icon === "string" ? data.weather[0].icon : "",
    };
    return NextResponse.json(weather);
  } catch (error) {
    console.warn("weather: lookup failed", error);
    return NextResponse.json(FALLBACK);
  }
}
