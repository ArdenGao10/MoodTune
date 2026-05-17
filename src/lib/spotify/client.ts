/*
 * Spotify Web API 封装层。
 * 所有方法仅可在服务端（Route Handler）调用 —— 内部通过 getCurrentToken()
 * 从 httpOnly cookie 取 token。收到 401 时自动作废 access cookie 并重试一次。
 */

import { getCurrentToken, invalidateAccessToken } from "./auth";
import type { SpotifyTrack, SpotifyUser } from "./types";

const API_BASE = "https://api.spotify.com/v1";

/** 未登录 / token 不可用时抛出，调用方据此降级 */
export class SpotifyAuthError extends Error {
  constructor() {
    super("Not authenticated with Spotify");
    this.name = "SpotifyAuthError";
  }
}

/* ---------- 底层请求 ---------- */

async function spotifyFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  let token = await getCurrentToken();
  if (!token) throw new SpotifyAuthError();

  const call = (t: string) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${t}` },
    });

  let res = await call(token);

  // token 在请求间隙刚好失效 —— 强制刷新后重试一次
  if (res.status === 401) {
    await invalidateAccessToken();
    token = await getCurrentToken();
    if (!token) throw new SpotifyAuthError();
    res = await call(token);
  }
  return res;
}

async function spotifyJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await spotifyFetch(path, init);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Spotify API ${res.status} ${path}: ${detail}`);
  }
  return (await res.json()) as T;
}

/* ---------- Spotify 原始响应类型（只列用到的字段） ---------- */

interface RawImage {
  url: string;
  height: number | null;
  width: number | null;
}

interface RawTrack {
  id: string;
  uri: string;
  name: string;
  artists: { name: string; id: string }[];
  album: { name: string; images: RawImage[] };
  duration_ms: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  popularity?: number;
}

interface RawUser {
  id: string;
  display_name: string | null;
  email?: string;
  product?: string;
  images?: RawImage[];
}

/** 原始 track → 应用内 SpotifyTrack（显式映射，丢弃多余字段） */
function toSpotifyTrack(raw: RawTrack): SpotifyTrack {
  return {
    id: raw.id,
    uri: raw.uri,
    name: raw.name,
    artists: raw.artists.map((a) => ({ name: a.name, id: a.id })),
    album: {
      name: raw.album.name,
      images: raw.album.images.map((i) => ({
        url: i.url,
        height: i.height ?? 0,
        width: i.width ?? 0,
      })),
    },
    duration_ms: raw.duration_ms,
    preview_url: raw.preview_url,
    external_urls: raw.external_urls,
  };
}

/* ---------- 搜索匹配 ---------- */

/** 归一化：转小写、去标点、压缩空白 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean);
}

/**
 * 给候选 track 打分。query 形如 `${title} ${artist}`。
 *  - 歌名相似度：歌名 token 落在 query 中的覆盖率（权重最高）
 *  - artist 包含关系：任一 artist token 出现在 query 中即满分
 *  - popularity：作为同分时的轻微倾向
 */
function scoreTrack(raw: RawTrack, query: string): number {
  const q = new Set(tokenize(query));
  const nameTokens = tokenize(raw.name);
  const artistTokens = raw.artists.flatMap((a) => tokenize(a.name));

  const nameScore = nameTokens.length
    ? nameTokens.filter((t) => q.has(t)).length / nameTokens.length
    : 0;
  const artistScore = artistTokens.some((t) => q.has(t)) ? 1 : 0;
  const popScore = (raw.popularity ?? 0) / 100;

  return nameScore * 0.6 + artistScore * 0.3 + popScore * 0.1;
}

/**
 * 用关键词搜歌，返回最佳匹配。query 推荐传 `${title} ${artist}`。
 * 完全匹配不上（最高分过低）时返回 null。
 */
export async function searchTrack(query: string): Promise<SpotifyTrack | null> {
  const q = query.trim();
  if (!q) return null;

  const data = await spotifyJson<{ tracks?: { items?: RawTrack[] } }>(
    `/search?type=track&limit=10&q=${encodeURIComponent(q)}`,
  );
  const items = data.tracks?.items ?? [];
  if (items.length === 0) return null;

  let best = items[0];
  let bestScore = scoreTrack(items[0], q);
  for (const item of items.slice(1)) {
    const score = scoreTrack(item, q);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }

  // 歌名几乎无重叠 —— 视为没匹配上，交给 unplayable 兜底
  if (bestScore < 0.15) return null;
  return toSpotifyTrack(best);
}

/* ---------- 单曲 ---------- */

export async function getTrackDetails(trackId: string): Promise<SpotifyTrack> {
  const raw = await spotifyJson<RawTrack>(
    `/tracks/${encodeURIComponent(trackId)}`,
  );
  return toSpotifyTrack(raw);
}

/* ---------- 播放控制 ---------- */

/** 成功时 Spotify 返回 204 No Content */
function assertPlaybackOk(res: Response, action: string): void {
  if (res.ok || res.status === 204) return;
  throw new Error(`Spotify ${action} failed: ${res.status}`);
}

/** 在指定设备上播放某首歌 —— PUT /me/player/play */
export async function playTrack(
  trackUri: string,
  deviceId: string,
): Promise<void> {
  const res = await spotifyFetch(
    `/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uris: [trackUri] }),
    },
  );
  assertPlaybackOk(res, "play");
}

/** 暂停 —— PUT /me/player/pause */
export async function pausePlayback(deviceId: string): Promise<void> {
  const res = await spotifyFetch(
    `/me/player/pause?device_id=${encodeURIComponent(deviceId)}`,
    { method: "PUT" },
  );
  assertPlaybackOk(res, "pause");
}

/** 继续播放 —— PUT /me/player/play（不带 body 即从当前位置恢复） */
export async function resumePlayback(deviceId: string): Promise<void> {
  const res = await spotifyFetch(
    `/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    { method: "PUT" },
  );
  assertPlaybackOk(res, "resume");
}

/* ---------- 当前用户 ---------- */

export async function getCurrentUser(): Promise<SpotifyUser> {
  const raw = await spotifyJson<RawUser>("/me");
  return {
    id: raw.id,
    display_name: raw.display_name,
    email: raw.email ?? "",
    product: raw.product ?? "free",
    images: (raw.images ?? []).map((i) => ({ url: i.url })),
  };
}
