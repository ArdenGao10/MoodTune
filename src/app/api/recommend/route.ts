/*
 * POST /api/recommend —— 调用智谱 GLM（OpenAI 兼容模式）生成 3 首歌曲推荐。
 *  - 无图片：走文本模型 glm-5.1；有图片：走视觉模型 glm-4.5v。
 *  - 关闭思考模式（enable_thinking: false）—— 推歌场景无需推理过程。
 *  - JSON 输出鲁棒解析（兼容 markdown fences），失败重试一次。
 *  - 已登录（cookie 有有效 Spotify token）时，额外把 3 首推荐匹配到
 *    Spotify，返回统一 Track[]（Real Mode 用）；未登录则只返回原始
 *    recommendations（既有 Demo 流程仍可用）。
 */

import { NextResponse } from "next/server";
import type OpenAI from "openai";
import { MODELS, parseJsonRobust, zhipu } from "@/lib/zhipu";
import { DJ_SYSTEM_PROMPT, buildUserText } from "@/lib/dj-prompt";
import { matchRecommendationsToTracks } from "@/lib/spotify/match";
import { recommendationsToTracks } from "@/lib/track";
import type {
  Recommendation,
  RecommendRequest,
  RecommendResponse,
  Track,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const DJ_ERROR = "The DJ needs a moment. Try again?";

export async function POST(
  req: Request,
): Promise<NextResponse<RecommendResponse>> {
  if (!process.env.ZHIPUAI_API_KEY) {
    console.error("ZHIPUAI_API_KEY is not set");
    return NextResponse.json({ error: DJ_ERROR }, { status: 500 });
  }

  let body: RecommendRequest;
  try {
    body = (await req.json()) as RecommendRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // 有图片 → 视觉模型；否则 → 文本模型
  const imageUrl = body.imageBase64; // 阶段 1 起即为完整 data URL
  const model = imageUrl ? MODELS.VISION : MODELS.TEXT;
  const userText = buildUserText(body);

  // 文本模型 content 为字符串；视觉模型 content 为 [文本, 图片] 数组
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: DJ_SYSTEM_PROMPT },
    {
      role: "user",
      content: imageUrl
        ? [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: imageUrl } },
          ]
        : userText,
    },
  ];

  async function callZhipu(): Promise<Recommendation[]> {
    const response = await zhipu.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      response_format: { type: "json_object" },
      // @ts-expect-error 智谱扩展参数：关闭思考模式（非 OpenAI 标准参数）
      enable_thinking: false,
    });

    const text = response.choices[0]?.message?.content ?? "";
    const parsed = parseJsonRobust<{ recommendations?: Recommendation[] }>(text);
    if (!parsed.recommendations?.length) {
      throw new Error("Empty recommendations");
    }
    return parsed.recommendations.slice(0, 3);
  }

  try {
    let recommendations: Recommendation[];
    try {
      recommendations = await callZhipu();
    } catch (firstError) {
      // 调用 / JSON 解析失败 —— 重试一次
      console.warn("recommend: first attempt failed, retrying", firstError);
      recommendations = await callZhipu();
    }

    // 永远匹配 Spotify（用 app token，无需登录）→ 附带统一 Track[]。
    // 匹配失败不影响主流程 —— 用纯推荐兜底，每首歌仍是「可发现的」。
    let tracks: Track[];
    try {
      tracks = await matchRecommendationsToTracks(recommendations);
    } catch (matchError) {
      console.warn("recommend: spotify matching failed", matchError);
      tracks = recommendationsToTracks(recommendations);
    }

    return NextResponse.json({ recommendations, tracks });
  } catch (error) {
    console.error("recommend: failed after retry", error);
    return NextResponse.json({ error: DJ_ERROR }, { status: 502 });
  }
}
