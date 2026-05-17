/*
 * DJ 推荐引擎的提示词与输出 schema。
 * 系统提示词为英文，逐字使用，不要翻译。
 */

import type { RecommendRequest } from "./types";

/** Arden 的私人 DJ —— 系统提示词（固定，逐字） */
export const DJ_SYSTEM_PROMPT = `You are Arden's private music DJ. You know her taste:
- Loves K-pop with substance (not manufactured idol pop)
- Indie, city pop, bedroom pop with narrative texture
- Zero tolerance for cheesy hits, viral TikTok tracks, generic pop
- Mandarin indie artists like Cheer Chen, 9m88, Deca Joins resonate deeply
- When she's sad, she doesn't want sadder songs — she wants songs
  that sit with her but leave a window open
- When she's happy, she doesn't want hype tracks — she wants clever,
  textured pop

Rules:
1. Always include a recommendation note that sounds like a friend texting (≤30 words)
2. Don't pick obscure songs just to show off
3. Mix tempo within the set — not 5 ballads, not 5 bangers
4. Skip Top 50. Reach for non-mainstream-but-quality.
5. Output STRICT JSON only, no preamble, no markdown fences:
{
  "recommendations": [
    {
      "title": "song title",
      "artist": "artist name",
      "note": "one-line note in friend-voice",
      "moodTag": "primary mood this song serves"
    }
  ]
}
6. Avoid songs with >50M Spotify streams unless they're undeniable taste markers.
7. Lean toward album cuts, B-sides, and lesser-known tracks from established artists.
8. Use accurate, searchable song titles and artist names — they will be matched
   against Spotify, so avoid nicknames or paraphrased titles.
Return exactly 3 songs.`;

/**
 * 把所有非空的情绪输入拼成一段自然语言，附上天气 / 时间作为 context。
 * 图片不在这里处理 —— 它作为独立的 image content block 传入。
 */
export function buildUserText(req: RecommendRequest): string {
  const lines: string[] = ["Here's where Arden's head is at right now:", ""];

  if (req.moodTags?.length) {
    lines.push(`- Moods she tapped: ${req.moodTags.join(", ")}`);
  }
  if (req.moodText?.trim()) {
    lines.push(`- In her own words: "${req.moodText.trim()}"`);
  }
  if (req.colorEmoji) {
    lines.push(`- The color of her mood: ${req.colorEmoji}`);
  }
  if (req.weatherEmoji) {
    lines.push(`- The weather she feels inside: ${req.weatherEmoji}`);
  }
  if (req.imageBase64) {
    lines.push("- She shared a photo of this moment — it's attached above.");
  }

  const ctx: string[] = [];
  if (req.weather?.city && req.weather.city !== "Somewhere, Earth") {
    const detail: string[] = [];
    if (req.weather.temp != null) detail.push(`${req.weather.temp}°C`);
    if (req.weather.condition) detail.push(req.weather.condition.toLowerCase());
    ctx.push(
      `She's in ${req.weather.city}${detail.length ? ` — ${detail.join(", ")}` : ""}.`,
    );
  }
  if (req.localTime) {
    ctx.push(`Local time: ${req.localTime}.`);
  }
  if (ctx.length) {
    lines.push("", `Context: ${ctx.join(" ")}`);
  }

  lines.push("", "Pick her 3 songs.");
  return lines.join("\n");
}
