/*
 * Spotify OAuth —— Authorization Code with PKCE 流程。
 *
 * 为什么用 PKCE：Implicit Grant 已被 Spotify 官方废弃；PKCE 不需要在
 * 浏览器里暴露 client secret，token 交换在服务端路由完成。
 *
 * 关于 client secret：纯 PKCE 流程的 token 端点**不传** client secret
 * （code_verifier 已经证明了客户端身份）。SPOTIFY_CLIENT_SECRET 仍在
 * .env 里保留 —— Dashboard 会一并给出，且未来若要切换到机密客户端流程
 * 可直接复用，但本文件不使用它。
 *
 * Token 存储：access / refresh 均放 httpOnly cookie。access cookie 的
 * maxAge 跟随 expires_in，过期即消失；getCurrentToken() 发现 access
 * 缺失但 refresh 仍在时，自动刷新并写回新 cookie。
 */

import { cookies } from "next/headers";

const ACCOUNTS = "https://accounts.spotify.com";

/** 申请的权限范围 —— streaming 为下一阶段的 Web Playback SDK 预留 */
export const SPOTIFY_SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
].join(" ");

/** cookie 名集中管理，避免散落字符串 */
export const SP_COOKIE = {
  access: "sp_access_token",
  refresh: "sp_refresh_token",
  /** PKCE code_verifier —— 仅在登录跳转 → 回调之间短暂存在 */
  verifier: "sp_pkce_verifier",
  /** CSRF state —— 同上 */
  state: "sp_oauth_state",
} as const;

const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // refresh token cookie：30 天
const TXN_MAX_AGE = 60 * 10; // verifier / state：10 分钟足够完成跳转

const isProd = process.env.NODE_ENV === "production";

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  /** 刷新时 Spotify 可能不返回新的 refresh_token */
  refresh_token?: string;
}

/* ---------- 环境变量 ---------- */

function clientId(): string {
  const id = process.env.SPOTIFY_CLIENT_ID;
  if (!id) throw new Error("SPOTIFY_CLIENT_ID is not set");
  return id;
}

/**
 * OAuth 回调地址 —— 必须与 Spotify Dashboard 登记的完全一致。
 * Spotify 已不再允许 localhost，需用 127.0.0.1 回环 IP。
 */
export function getRedirectUri(): string {
  return (
    process.env.SPOTIFY_REDIRECT_URI ??
    "http://127.0.0.1:3000/api/auth/spotify/callback"
  );
}

/** Spotify 是否已配置 —— 路由用它返回友好错误而非崩溃 */
export function isSpotifyConfigured(): boolean {
  return Boolean(process.env.SPOTIFY_CLIENT_ID);
}

/* ---------- cookie 选项 ---------- */

export function accessCookieOptions(expiresIn: number) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    // 提前 60s 过期，给 getCurrentToken 留出刷新余量
    maxAge: Math.max(0, expiresIn - 60),
  };
}

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: REFRESH_MAX_AGE,
  };
}

export function txnCookieOptions() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: TXN_MAX_AGE,
  };
}

/* ---------- PKCE 工具 ---------- */

/** 字节数组 → base64url（无填充） */
function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** code_verifier —— 64 随机字节 → 86 字符，落在 PKCE 要求的 43–128 区间 */
export function generateCodeVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/** CSRF state */
export function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/** code_challenge = base64url(SHA-256(verifier)) */
async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64url(digest);
}

/* ---------- 流程 ---------- */

/**
 * 构造 Spotify 授权 URL。
 * 返回的 verifier / state 由调用方（login 路由）写入 httpOnly cookie，
 * 回调时取出校验。
 */
export async function getAuthUrl(): Promise<{
  url: string;
  verifier: string;
  state: string;
}> {
  const verifier = generateCodeVerifier();
  const state = generateState();
  const challenge = await codeChallenge(verifier);

  const params = new URLSearchParams({
    client_id: clientId(),
    response_type: "code",
    redirect_uri: getRedirectUri(),
    scope: SPOTIFY_SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
  });

  return { url: `${ACCOUNTS}/authorize?${params.toString()}`, verifier, state };
}

async function requestToken(
  body: URLSearchParams,
): Promise<SpotifyTokenResponse> {
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Spotify token endpoint ${res.status}: ${detail}`);
  }
  return (await res.json()) as SpotifyTokenResponse;
}

/** 用授权码 + PKCE verifier 换取 token */
export function exchangeCodeForToken(
  code: string,
  verifier: string,
): Promise<SpotifyTokenResponse> {
  return requestToken(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
      client_id: clientId(),
      code_verifier: verifier,
    }),
  );
}

/** 用 refresh token 换取新的 access token */
export function refreshAccessToken(
  refreshToken: string,
): Promise<SpotifyTokenResponse> {
  return requestToken(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId(),
    }),
  );
}

/**
 * 取当前可用的 access token —— 仅可在 Route Handler 内调用（会读写 cookie）。
 *  - access cookie 还在 → 直接返回
 *  - access 过期但 refresh 还在 → 刷新、写回新 cookie、返回
 *  - 都没有 / 刷新失败 → 返回 null（视为未登录）
 */
export async function getCurrentToken(): Promise<string | null> {
  const store = await cookies();

  const access = store.get(SP_COOKIE.access)?.value;
  if (access) return access;

  const refresh = store.get(SP_COOKIE.refresh)?.value;
  if (!refresh) return null;

  try {
    const token = await refreshAccessToken(refresh);
    store.set(
      SP_COOKIE.access,
      token.access_token,
      accessCookieOptions(token.expires_in),
    );
    if (token.refresh_token) {
      store.set(
        SP_COOKIE.refresh,
        token.refresh_token,
        refreshCookieOptions(),
      );
    }
    return token.access_token;
  } catch (error) {
    console.warn("spotify: refresh failed, clearing tokens", error);
    store.delete(SP_COOKIE.access);
    store.delete(SP_COOKIE.refresh);
    return null;
  }
}

/**
 * 作废当前 access cookie —— 用于 API 调用收到 401 时强制下一次走刷新。
 * 仅可在 Route Handler 内调用。
 */
export async function invalidateAccessToken(): Promise<void> {
  const store = await cookies();
  store.delete(SP_COOKIE.access);
}
