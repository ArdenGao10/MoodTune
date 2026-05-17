/*
 * 智谱 GLM 接入 —— 走 OpenAI 兼容模式。
 * Base URL 指向智谱开放平台，API key 从 ZHIPUAI_API_KEY 读取。
 */

import OpenAI from "openai";

/** 模型常量 —— 抽成配置，方便未来切换 */
export const MODELS = {
  /** 纯文本推荐 / 月度回顾反思 */
  TEXT: "glm-5.1",
  /** 用户上传图片时的视觉模型 */
  VISION: "glm-4.5v",
} as const;

// 缺少 key 时用占位串构造，避免在模块加载（含构建期）抛错；
// 真正的 key 校验放在路由里，缺失时返回友好错误。
export const zhipu = new OpenAI({
  // 用 || 而非 ?? —— 空字符串也要回退到占位串
  apiKey: process.env.ZHIPUAI_API_KEY || "ZHIPUAI_API_KEY_NOT_SET",
  baseURL: "https://open.bigmodel.cn/api/paas/v4/",
});

/**
 * 鲁棒 JSON 解析 —— GLM 偶尔会带 markdown fences。
 * 先去掉 ```json / ``` 标记，再用正则提取第一个完整的 { ... } 块。
 */
export function parseJsonRobust<T = unknown>(text: string): T {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("No JSON object found in response");
  }
  return JSON.parse(match[0]) as T;
}
