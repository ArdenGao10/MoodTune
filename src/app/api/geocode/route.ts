/*
 * GET /api/geocode?q=城市名 —— OpenWeather geocoding 代理。
 * 把城市名解析为坐标，API key 留服务端。供手动选择「Other」时使用。
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json({ error: "Missing city" }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json(
      { error: "Geocoding unavailable" },
      { status: 503 },
    );
  }

  try {
    const url =
      `https://api.openweathermap.org/geo/1.0/direct` +
      `?q=${encodeURIComponent(q)}&limit=1&appid=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`OpenWeather geo ${res.status}`);

    const list = await res.json();
    const top = Array.isArray(list) ? list[0] : undefined;
    if (!top || typeof top.lat !== "number" || typeof top.lon !== "number") {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    return NextResponse.json({
      city: typeof top.name === "string" ? top.name : q,
      lat: top.lat,
      lon: top.lon,
    });
  } catch (error) {
    console.warn("geocode: lookup failed", error);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }
}
