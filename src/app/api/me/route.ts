/*
 * GET /api/me —— 返回当前 Spotify 用户（含 product 字段）。
 * 未登录 / token 失效 → { user: null }。
 * MusicSourceContext 用它在客户端判断 demo / real 模式。
 */

import { NextResponse } from "next/server";
import { getCurrentToken } from "@/lib/spotify/auth";
import { getCurrentUser } from "@/lib/spotify/client";
import type { MeResponse } from "@/lib/spotify/types";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse<MeResponse>> {
  const token = await getCurrentToken();
  if (!token) return NextResponse.json({ user: null });

  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (error) {
    console.warn("/api/me: failed to load Spotify user", error);
    return NextResponse.json({ user: null });
  }
}
