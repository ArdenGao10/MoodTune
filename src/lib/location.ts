/*
 * 定位 —— 三层降级策略：
 *  1. 浏览器 navigator.geolocation（最准，5s 超时）
 *  2. IP 定位 ipapi.co（无需授权，从浏览器调用以定位访客自身 IP）
 *  3. 手动选择（由天气 widget 的 UI 驱动，见 setManualLocation）
 *
 * 结果缓存在 localStorage，下次优先使用。
 * 仅在客户端调用。
 */

export type LocationSource = "browser" | "ip" | "manual";

export interface LocationResult {
  city: string;
  lat: number;
  lon: number;
  source: LocationSource;
}

const CACHE_KEY = "moodtune_location";

/** 手动选择的候选城市及坐标 */
const PRESET_CITIES: Record<string, { lat: number; lon: number }> = {
  Beijing: { lat: 39.9042, lon: 116.4074 },
  Shanghai: { lat: 31.2304, lon: 121.4737 },
  "New York": { lat: 40.7128, lon: -74.006 },
  Tokyo: { lat: 35.6762, lon: 139.6503 },
  London: { lat: 51.5074, lon: -0.1278 },
};

export const PRESET_CITY_NAMES = Object.keys(PRESET_CITIES);

/* ---------- 缓存 ---------- */

function isLocationResult(value: unknown): value is LocationResult {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    typeof o.city === "string" &&
    typeof o.lat === "number" &&
    typeof o.lon === "number" &&
    (o.source === "browser" || o.source === "ip" || o.source === "manual")
  );
}

export function getCachedLocation(): LocationResult | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isLocationResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function cacheLocation(loc: LocationResult): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(loc));
  } catch {
    // localStorage 不可用时静默降级
  }
}

export function clearLocationCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // 忽略
  }
}

/* ---------- 第 1 层：浏览器定位 ---------- */

function browserLocation(): Promise<LocationResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          city: "",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          source: "browser",
        }),
      (err) => reject(err),
      // 5s 拿不到就放弃
      { timeout: 5000, maximumAge: 10 * 60 * 1000 },
    );
  });
}

/* ---------- 第 2 层：IP 定位 ---------- */

async function ipLocation(): Promise<LocationResult> {
  const res = await fetch("https://ipapi.co/json/", {
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`ipapi.co ${res.status}`);
  const data = await res.json();
  if (typeof data.latitude !== "number" || typeof data.longitude !== "number") {
    throw new Error("ipapi.co: no coordinates");
  }
  return {
    city: typeof data.city === "string" ? data.city : "",
    lat: data.latitude,
    lon: data.longitude,
    source: "ip",
  };
}

/* ---------- 主入口 ---------- */

/**
 * 三层降级的自动定位：浏览器 → IP。
 * 两层都失败时 reject —— 由天气 widget 接住并引导用户手动选择（第 3 层）。
 */
export async function getLocation(): Promise<LocationResult> {
  try {
    const browser = await browserLocation();
    cacheLocation(browser);
    return browser;
  } catch {
    // 浏览器定位失败 / 拒绝 / 超时 —— 降级到 IP
  }
  const ip = await ipLocation();
  cacheLocation(ip);
  return ip;
}

/**
 * 手动设定城市。预置城市直接取坐标；其余走 OpenWeather geocoding（经 /api/geocode）。
 * 成功后写入缓存。
 */
export async function setManualLocation(city: string): Promise<LocationResult> {
  const name = city.trim();
  if (!name) throw new Error("empty city");

  const preset = PRESET_CITIES[name];
  let loc: LocationResult;
  if (preset) {
    loc = { city: name, lat: preset.lat, lon: preset.lon, source: "manual" };
  } else {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(name)}`);
    if (!res.ok) throw new Error("geocode failed");
    const data = await res.json();
    if (typeof data.lat !== "number" || typeof data.lon !== "number") {
      throw new Error("city not found");
    }
    loc = {
      city: typeof data.city === "string" ? data.city : name,
      lat: data.lat,
      lon: data.lon,
      source: "manual",
    };
  }
  cacheLocation(loc);
  return loc;
}
