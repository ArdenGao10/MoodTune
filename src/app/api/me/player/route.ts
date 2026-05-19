/*
 * PUT /api/me/player —— 在 Web Playback SDK 注册的浏览器设备上播放一首歌。
 * Body: { uri: string; deviceId: string }（Spotify track uri + SDK device id）。
 * 仅 Premium 用户的 SDK 设备可用 —— 调用方需确保 SDK 已就绪。
 */

import { NextResponse } from "next/server";
import { playTrack, SpotifyAuthError } from "@/lib/spotify/client";

export const runtime = "nodejs";

export async function PUT(req: Request): Promise<NextResponse> {
  let uri: string;
  let deviceId: string;
  try {
    const body = (await req.json()) as { uri?: unknown; deviceId?: unknown };
    if (typeof body.uri !== "string" || typeof body.deviceId !== "string") {
      throw new Error("bad body");
    }
    uri = body.uri;
    deviceId = body.deviceId;
  } catch {
    return NextResponse.json(
      { error: "Expected { uri, deviceId }." },
      { status: 400 },
    );
  }

  try {
    await playTrack(uri, deviceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SpotifyAuthError) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    console.error("/api/me/player failed:", error);
    return NextResponse.json(
      { error: "Couldn't start playback." },
      { status: 502 },
    );
  }
}
