"use client";

/*
 * <SpotifyAuthButton /> —— 临时测试按钮（阶段 1 验收用）。
 * 放在顶栏右上角，验证 OAuth 跳转 + 回调。下一阶段做正式 UI 时会被替换。
 */

import { useMusicSource } from "@/contexts/MusicSourceContext";

export function SpotifyAuthButton() {
  const { user, mode, isPremium, ready, login, logout } = useMusicSource();

  // /api/me 未返回前不渲染，避免「未登录 → 已登录」的闪烁
  if (!ready) return null;

  const base =
    "rounded-full border border-mt-stroke px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-mt-muted transition-colors hover:border-mt-strong hover:text-mt-fg";

  if (user) {
    return (
      <button
        type="button"
        onClick={logout}
        className={base}
        title={`mode: ${mode} · product: ${isPremium ? "premium" : "free"}`}
      >
        {user.display_name ?? "Spotify"} · Log out
      </button>
    );
  }

  return (
    <button type="button" onClick={login} className={base}>
      Log in with Spotify
    </button>
  );
}
