/*
 * GET /api/youtube/search?q=...　—— 把「歌名 歌手」解析成可播放的 YouTube
 * videoId + 缩略图。PlaybackProvider 在某首歌成为当前曲目时按需调用。
 */

import { NextResponse } from "next/server";
import { isYouTubeConfigured, searchYouTubeVideo } from "@/lib/youtube/client";

export const runtime = "nodejs";

export interface YouTubeSearchResponse {
  videoId: string | null;
  /** 匹配视频的缩略图 —— 用作专辑封面 */
  thumbnailUrl?: string | null;
  error?: string;
}

export async function GET(
  req: Request,
): Promise<NextResponse<YouTubeSearchResponse>> {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json(
      { videoId: null, error: "missing_query" },
      { status: 400 },
    );
  }

  if (!isYouTubeConfigured()) {
    console.error("/api/youtube/search: YOUTUBE_API_KEY is not set");
    return NextResponse.json(
      { videoId: null, error: "not_configured" },
      { status: 500 },
    );
  }

  try {
    const match = await searchYouTubeVideo(q);
    return NextResponse.json({
      videoId: match?.videoId ?? null,
      thumbnailUrl: match?.thumbnailUrl ?? null,
    });
  } catch (error) {
    console.error("/api/youtube/search failed:", error);
    return NextResponse.json(
      { videoId: null, error: "search_failed" },
      { status: 502 },
    );
  }
}
