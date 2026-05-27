"use client";

/*
 * /mood-input —— 情绪输入页。
 * 静态手绘唱片 + 手写体提示 + 四种情绪输入 + PLAY。
 * 点击 PLAY 即发起推荐请求并跳转到 /recommendations。
 */

import { MoodInputView } from "@/components/mood-input-view";

export default function MoodInputPage() {
  return <MoodInputView />;
}
