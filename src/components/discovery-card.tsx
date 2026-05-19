"use client";

/*
 * <DiscoveryCard /> —— 推荐结果页的核心：一首歌一张「发现卡」。
 * 不是播放器，是发现卡：封面 + 歌名 + Yuna 推荐语 + 30s 试听 + 反馈 +
 * 6 个跨平台跳转。任何一首歌都不会出现「无法播放」的死路径。
 *
 * 登录 Spotify 后右上角追加增强按钮：
 *  - Premium → Full Play（Web Playback SDK 全曲播放）
 *  - 免费    → Add to Spotify Library
 *  - 未登录  → 一行「Sign in with Spotify · optional」（不强推）
 */

import { useEffect, useState } from "react";
import { Ban, Check, Copy, Heart, Loader2, Meh, Pause, Play } from "lucide-react";
import { BrandCover } from "@/components/BrandCover";
import {
  PlatformIcon,
  PLATFORM_LABELS,
  PLATFORM_ORDER,
} from "@/components/platform-icons";
import { useMusicSource } from "@/contexts/MusicSourceContext";
import { usePreview } from "@/contexts/PreviewContext";
import { useSpotifyPlayback } from "@/contexts/SpotifyPlaybackContext";
import { buildSearchLinks, copyTrackToClipboard } from "@/lib/external-links";
import { getFeedback, setFeedback } from "@/lib/feedback";
import { resolveYouTube } from "@/lib/youtube/resolve";
import type { FeedbackKind, Track } from "@/lib/types";

/* ---------- 反馈按钮 ---------- */
const FEEDBACK_OPTIONS: {
  kind: FeedbackKind;
  Icon: typeof Heart;
  label: string;
}[] = [
  { kind: "love", Icon: Heart, label: "Love it" },
  { kind: "meh", Icon: Meh, label: "Meh" },
  { kind: "skip", Icon: Ban, label: "Not for me" },
];

export function DiscoveryCard({ track }: { track: Track }) {
  const { ready: meReady, user, isPremium, login } = useMusicSource();
  const preview = usePreview();
  const sp = useSpotifyPlayback();

  const [feedback, setFb] = useState<FeedbackKind | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  // 封面：Spotify 匹配到就直接用；没有则回填 YouTube 缩略图（与播放器同源）
  const [coverUrl, setCoverUrl] = useState<string | null>(track.albumArt);

  // 反馈状态从 localStorage 读 —— 必须在 effect 里读，否则首帧服务端/客户端
  // 不一致会触发 hydration 报错。这一次额外渲染是有意的。
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFb(getFeedback(track.id));
  }, [track.id]);

  // 没有 Spotify 封面 → 解析 YouTube 缩略图兜底
  useEffect(() => {
    if (track.albumArt) return;
    let alive = true;
    void resolveYouTube(track.title, track.artist).then((candidates) => {
      const thumb = candidates[0]?.thumbnailUrl;
      if (alive && thumb) setCoverUrl(thumb);
    });
    return () => {
      alive = false;
    };
  }, [track.albumArt, track.title, track.artist]);

  const links = buildSearchLinks(track.title, track.artist, track.spotifyId);

  /* ---- 试听 ---- */
  const isThisPreview = preview.activeId === track.id;
  const previewStatus = isThisPreview ? preview.status : "idle";
  const previewUnavailable = preview.isUnavailable(track.id);

  const handlePreview = () => {
    if (sp.isPlaying) sp.toggle(); // 开试听前先停掉全曲播放
    preview.toggle(track);
  };

  /* ---- 复制歌名 ---- */
  const handleCopy = () => {
    void copyTrackToClipboard(track.title, track.artist).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ---- 加入 Spotify 收藏 ---- */
  const handleSave = () => {
    if (saved || saving || !track.spotifyId) return;
    setSaving(true);
    fetch("/api/me/tracks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [track.spotifyId] }),
    })
      .then((res) => {
        if (res.ok) setSaved(true);
      })
      .catch(() => {})
      .finally(() => setSaving(false));
  };

  /* ---- 增强按钮（登录 Spotify 后） ---- */
  const isThisFull = !!track.spotifyUri && sp.activeUri === track.spotifyUri;
  const fullPlaying = isThisFull && sp.isPlaying;

  const handleFullPlay = () => {
    preview.stop(); // 全曲播放前先停掉试听
    if (isThisFull) sp.toggle();
    else sp.playFull(track);
  };

  const pillBase =
    "flex items-center gap-1.5 rounded-lg border border-mt-stroke px-2.5 py-2 text-[11px] transition-colors";

  return (
    <article className="rounded-2xl border border-mt-stroke bg-card p-5 sm:p-6">
      {/* ---- 头部：封面 + 歌名 + 增强按钮 ---- */}
      <div className="flex items-start gap-4">
        <div className="size-20 shrink-0 overflow-hidden rounded-lg border border-mt-stroke">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={`${track.title} cover`}
              className="size-full object-cover"
            />
          ) : (
            <BrandCover size={80} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {track.moodTag && (
            <p className="text-eyebrow mb-1 truncate text-mt-muted">
              {track.moodTag}
            </p>
          )}
          <h3 className="truncate text-[17px] font-bold tracking-[-0.01em] text-mt-fg">
            {track.title}
          </h3>
          <p className="text-artist mt-1 truncate text-[11px] text-mt-muted">
            {track.artist}
            {track.album ? ` · ${track.album}` : ""}
          </p>
        </div>

        {/* 增强按钮区 —— /api/me 未返回前不渲染，避免闪烁 */}
        {meReady && (
          <div className="flex shrink-0 justify-end">
            {!user && (
              <button
                type="button"
                onClick={login}
                className="max-w-[96px] text-right text-[10px] leading-tight text-mt-muted underline-offset-2 hover:text-mt-fg hover:underline"
              >
                Sign in with Spotify · optional
              </button>
            )}

            {user && isPremium && track.spotifyUri && (
              <button
                type="button"
                onClick={handleFullPlay}
                disabled={!sp.ready}
                title={
                  sp.ready
                    ? "Play the full track in your browser"
                    : "Connecting to Spotify…"
                }
                className="flex items-center gap-1.5 rounded-full border border-mt-stroke px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-mt-fg transition-colors hover:border-mt-strong disabled:opacity-40"
              >
                {fullPlaying ? (
                  <Pause className="size-3.5 fill-current" />
                ) : (
                  <Play className="size-3.5 fill-current" />
                )}
                {fullPlaying ? "Playing" : "Full Play"}
              </button>
            )}

            {user && !isPremium && track.spotifyId && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || saved}
                className="flex items-center gap-1.5 rounded-full border border-mt-stroke px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.12em] text-mt-fg transition-colors hover:border-mt-strong disabled:opacity-60"
              >
                {saved ? (
                  <Check className="size-3.5" />
                ) : saving ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Heart className="size-3.5" />
                )}
                {saved ? "Added" : "Add to Library"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---- Yuna 推荐语 ---- */}
      <div className="mt-4 border-l border-mt-stroke pl-4">
        <p className="text-[14px] italic leading-[1.65] text-mt-fg">
          {track.djNote}
        </p>
        <p className="font-hand mt-1 text-right text-[18px] text-mt-muted">
          — Yuna
        </p>
      </div>

      {/* ---- 试听 + 反馈 ---- */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handlePreview}
          disabled={previewUnavailable}
          title={
            previewUnavailable
              ? "No preview available · open in your music app to listen"
              : "Play a 30-second preview"
          }
          className="flex items-center gap-2 rounded-full border border-mt-strong px-4 py-2 text-[12px] font-medium text-mt-fg transition-colors hover:bg-mt-fg hover:text-mt-bg disabled:cursor-not-allowed disabled:border-mt-stroke disabled:text-mt-faint disabled:hover:bg-transparent"
        >
          {previewUnavailable ? (
            <>
              <Ban className="size-4" />
              No preview
            </>
          ) : previewStatus === "loading" ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Loading…
            </>
          ) : previewStatus === "playing" ? (
            <>
              <Pause className="size-4 fill-current" />
              Stop preview
            </>
          ) : (
            <>
              <Play className="size-4 fill-current" />
              Preview 30s
            </>
          )}
        </button>

        <div className="flex items-center gap-1">
          {FEEDBACK_OPTIONS.map(({ kind, Icon, label }) => {
            const active = feedback === kind;
            return (
              <button
                key={kind}
                type="button"
                aria-label={label}
                aria-pressed={active}
                title={label}
                onClick={() => setFb(setFeedback(track.id, kind))}
                className={`flex size-9 items-center justify-center rounded-full border transition-colors ${
                  active
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-mt-stroke text-mt-muted hover:border-mt-strong hover:text-mt-fg"
                }`}
              >
                <Icon
                  className={`size-4 ${active && kind === "love" ? "fill-current" : ""}`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- Listen on：6 个跨平台跳转 ---- */}
      <div className="mt-5">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-mt-stroke" />
          <span className="text-eyebrow text-mt-muted">Listen on</span>
          <span className="h-px flex-1 bg-mt-stroke" />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {PLATFORM_ORDER.map((key) => (
            <a
              key={key}
              href={links[key]}
              target="_blank"
              rel="noopener noreferrer"
              title={PLATFORM_LABELS[key]}
              className={`${pillBase} text-mt-muted hover:border-mt-strong hover:text-mt-fg`}
            >
              <PlatformIcon platform={key} size={16} />
              <span className="truncate">{PLATFORM_LABELS[key]}</span>
            </a>
          ))}

          <button
            type="button"
            onClick={handleCopy}
            title="复制歌名"
            className={`${pillBase} ${
              copied
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "text-mt-muted hover:border-mt-strong hover:text-mt-fg"
            }`}
          >
            {copied ? (
              <Check className="size-4 shrink-0" />
            ) : (
              <Copy className="size-4 shrink-0" />
            )}
            <span className="truncate">{copied ? "Copied ✓" : "复制歌名"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
