/*
 * GET /api/youtube/search?q=...　—— 把「歌名 歌手」解析成一组可播放的
 * YouTube 候选视频(videoId + 缩略图)。PlaybackProvider 在某首歌成为
 * 当前曲目时按需调用;遇到放不了的会顺位换下一个候选。
 */

import { NextResponse } from "next/server";
import {
  isYouTubeConfigured,
  searchYouTubeVideos,
  type YouTubeCandidate,
} from "@/lib/youtube/client";

export const runtime = "nodejs";

export interface YouTubeSearchResponse {
  /** 已按匹配度排序的候选视频 */
  candidates: YouTubeCandidate[];
  error?: string;
}

export async function GET(
  req: Request,
): Promise<NextResponse<YouTubeSearchResponse>> {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json(
      { candidates: [], error: "missing_query" },
      { status: 400 },
    );
  }

  if (!isYouTubeConfigured()) {
    console.error("/api/youtube/search: YOUTUBE_API_KEY is not set");
    return NextResponse.json(
      { candidates: [], error: "not_configured" },
      { status: 500 },
    );
  }

  try {
    const candidates = await searchYouTubeVideos(q);
    return NextResponse.json({ candidates });
  } catch (error) {
    console.error("/api/youtube/search failed:", error);
    return NextResponse.json(
      { candidates: [], error: "search_failed" },
      { status: 502 },
    );
  }
}
