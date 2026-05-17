/*
 * GET /api/auth/spotify/login —— 发起 Spotify OAuth（PKCE）。
 * 生成 code_verifier / state，写入短期 httpOnly cookie，再 302 跳转到
 * Spotify 授权页。回调路由会取出 cookie 校验。
 *
 * Host 自我纠正：PKCE 的 verifier/state cookie 必须和回调落在同一个
 * host，否则跨 host（localhost vs 127.0.0.1）读不到。若浏览器当前 host
 * 与回调 host 不一致，先把浏览器重定向到正确 host 上的本路由。
 */

import { NextResponse } from "next/server";
import {
  getAuthUrl,
  getRedirectUri,
  isSpotifyConfigured,
  SP_COOKIE,
  txnCookieOptions,
} from "@/lib/spotify/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isSpotifyConfigured()) {
    return NextResponse.json(
      { error: "Spotify is not configured. Set SPOTIFY_CLIENT_ID in .env.local." },
      { status: 500 },
    );
  }

  // 浏览器当前 host 与回调 host 不一致 → 先把浏览器拉到回调 host 上重来。
  // 用 Host 请求头判断（地址栏真实 host）—— req.url 的 host 在 dev 下不可靠，
  // 跟随重定向后浏览器会带上新 host，因此不会死循环。
  const callbackUrl = new URL(getRedirectUri());
  const host = req.headers.get("host");
  if (host && host !== callbackUrl.host) {
    const target = new URL(
      "/api/auth/spotify/login",
      `${callbackUrl.protocol}//${callbackUrl.host}`,
    );
    return NextResponse.redirect(target);
  }

  const { url, verifier, state } = await getAuthUrl();
  const res = NextResponse.redirect(url);
  res.cookies.set(SP_COOKIE.verifier, verifier, txnCookieOptions());
  res.cookies.set(SP_COOKIE.state, state, txnCookieOptions());
  return res;
}
