/*
 * PUT /api/me/tracks —— 把歌加进当前用户的 Spotify「我喜欢」。
 * Body: { ids: string[] }（Spotify track id）。
 * 需要 user-library-modify scope —— 老用户需重新登录一次。
 */

import { NextResponse } from "next/server";
import { addTracksToLibrary, SpotifyAuthError } from "@/lib/spotify/client";

export const runtime = "nodejs";

export async function PUT(req: Request): Promise<NextResponse> {
  let ids: string[];
  try {
    const body = (await req.json()) as { ids?: unknown };
    ids = Array.isArray(body.ids)
      ? body.ids.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  if (ids.length === 0) {
    return NextResponse.json({ error: "No track ids." }, { status: 400 });
  }

  try {
    await addTracksToLibrary(ids);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SpotifyAuthError) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    console.error("/api/me/tracks failed:", error);
    return NextResponse.json(
      { error: "Couldn't save to your library." },
      { status: 502 },
    );
  }
}
