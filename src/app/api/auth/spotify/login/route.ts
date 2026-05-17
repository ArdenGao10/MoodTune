/*
 * GET /api/auth/spotify/login —— 发起 Spotify OAuth（PKCE）。
 * 生成 code_verifier / state，写入短期 httpOnly cookie，再 302 跳转到
 * Spotify 授权页。回调路由会取出 cookie 校验。
 */

import { NextResponse } from "next/server";
import { getAuthUrl, isSpotifyConfigured, SP_COOKIE, txnCookieOptions } from "@/lib/spotify/auth";

export const runtime = "nodejs";

export async function GET() {
  if (!isSpotifyConfigured()) {
    return NextResponse.json(
      { error: "Spotify is not configured. Set SPOTIFY_CLIENT_ID in .env.local." },
      { status: 500 },
    );
  }

  const { url, verifier, state } = await getAuthUrl();
  const res = NextResponse.redirect(url);
  res.cookies.set(SP_COOKIE.verifier, verifier, txnCookieOptions());
  res.cookies.set(SP_COOKIE.state, state, txnCookieOptions());
  return res;
}
