/*
 * GET /api/auth/spotify/token —— 把当前用户的 Spotify access token 交给
 * 浏览器端的 Web Playback SDK（SDK 的 getOAuthToken 回调需要原始 token）。
 * 未登录 / token 失效 → { token: null }。
 */

import { NextResponse } from "next/server";
import { getCurrentToken } from "@/lib/spotify/auth";

export const runtime = "nodejs";

export interface SpotifyTokenRouteResponse {
  token: string | null;
}

export async function GET(): Promise<NextResponse<SpotifyTokenRouteResponse>> {
  const token = await getCurrentToken();
  return NextResponse.json({ token: token ?? null });
}
