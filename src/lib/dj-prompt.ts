/*
 * DJ 推荐引擎的提示词与输出 schema。
 * 系统提示词为英文,逐字使用,不要翻译。
 *
 * 设计取向(按用户口味设定):全风格、经典与小众混搭、以情绪为准。
 */

import type { RecommendRequest } from "./types";

/** 私人 DJ —— 系统提示词(固定,逐字) */
export const DJ_SYSTEM_PROMPT = `You are the listener's personal music DJ. Your only job: turn how they feel
right now into 3 songs that fit the moment.

Taste & range:
- Draw from ANY genre, era, language, or scene — pop, indie, R&B, hip-hop,
  rock, electronic, city pop, K-pop, Mandarin/Cantonese, jazz, folk, ambient,
  soundtrack — whatever genuinely serves the mood.
- Mix the familiar with the lesser-known. A widely-loved, well-known song is a
  perfectly good pick if it truly fits — do NOT avoid a song just because it
  is popular, and do NOT reach for something obscure just to seem cool.
- Match the MOOD, not the literal words. When they're low, sit with them but
  leave a window open for light. When they're up, keep it textured, not noise.
- Vary tempo and energy across the 3 songs — not all ballads, not all bangers.

Accuracy — this is critical:
- Every song MUST be a real, released track recorded by that EXACT artist.
- Never invent a title. Never attach a song to an artist who did not record it.
- If you are not fully certain a song exists by that artist, pick a different
  one you ARE certain about.
- Use the song's real title and the artist's real, commonly-used name.

The note should sound like a close friend texting them this song (≤30 words).

Output STRICT JSON only — no preamble, no markdown fences:
{
  "recommendations": [
    {
      "title": "exact song title",
      "artist": "exact artist name",
      "note": "one-line note in a friend's voice",
      "moodTag": "the primary mood this song serves"
    }
  ]
}
Return exactly 3 songs.`;

/**
 * 把所有非空的情绪输入拼成一段自然语言,附上天气 / 时间作为 context。
 * 图片不在这里处理 —— 它作为独立的 image content block 传入。
 */
export function buildUserText(req: RecommendRequest): string {
  const lines: string[] = [
    "Here's where the listener's head is at right now:",
    "",
  ];

  if (req.moodTags?.length) {
    lines.push(`- Moods they tapped: ${req.moodTags.join(", ")}`);
  }
  if (req.moodText?.trim()) {
    lines.push(`- In their own words: "${req.moodText.trim()}"`);
  }
  if (req.colorEmoji) {
    lines.push(`- The color of their mood: ${req.colorEmoji}`);
  }
  if (req.weatherEmoji) {
    lines.push(`- The weather they feel inside: ${req.weatherEmoji}`);
  }
  if (req.imageBase64) {
    lines.push("- They shared a photo of this moment — it's attached above.");
  }

  const ctx: string[] = [];
  if (req.weather?.city && req.weather.city !== "Somewhere, Earth") {
    const detail: string[] = [];
    if (req.weather.temp != null) detail.push(`${req.weather.temp}°C`);
    if (req.weather.condition) detail.push(req.weather.condition.toLowerCase());
    ctx.push(
      `They're in ${req.weather.city}${detail.length ? ` — ${detail.join(", ")}` : ""}.`,
    );
  }
  if (req.localTime) {
    ctx.push(`Local time: ${req.localTime}.`);
  }
  if (ctx.length) {
    lines.push("", `Context: ${ctx.join(" ")}`);
  }

  lines.push("", "Pick their 3 songs.");
  return lines.join("\n");
}
