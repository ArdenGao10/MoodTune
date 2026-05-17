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

  // 当前 host 与回调 host 不一致 → 先把浏览器拉到回调 host 上重来
  const callbackUrl = new URL(getRedirectUri());
  const reqUrl = new URL(req.url);
  if (reqUrl.host !== callbackUrl.host) {
    reqUrl.protocol = callbackUrl.protocol;
    reqUrl.host = callbackUrl.host;
    return NextResponse.redirect(reqUrl);
  }

  const { url, verifier, state } = await getAuthUrl();
  const res = NextResponse.redirect(url);
  res.cookies.set(SP_COOKIE.verifier, verifier, txnCookieOptions());
  res.cookies.set(SP_COOKIE.state, state, txnCookieOptions());
  return res;
}
