"use client";

/*
 * /discover —— 「音乐发现层」页面（推荐结果页的候补形态）。
 * 主页面 /recommendations 是站内黑胶播放器；这里把同一组推荐摊成 3 张发现卡：
 * 封面 + Yuna 推荐语 + 30s 试听 + 6 个跨平台跳转。
 *
 * 进入本页时暂停站内播放器 —— 试听与全曲播放不互相打架。
 */

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DiscoveryCard } from "@/components/discovery-card";
import { useMoodSession } from "@/components/mood-session-provider";
import { usePlayback } from "@/contexts/PlaybackContext";
import type { Track } from "@/lib/types";

function BackToPlayer() {
  return (
    <Link
      href="/recommendations"
      className="group inline-flex items-center gap-1.5 text-eyebrow text-mt-muted transition-colors hover:text-mt-fg"
    >
      <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
      Back to player
    </Link>
  );
}

/* ---------- idle (无会话) ---------- */
function IdleView() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-16 text-center">
      <p className="text-eyebrow text-mt-muted">No session yet</p>
      <h1 className="text-display text-[44px] text-mt-fg md:text-[64px]">
        Set your
        <br />
        mood first
      </h1>
      <Link
        href="/"
        className="text-eyebrow mt-2 text-mt-muted underline-offset-4 hover:text-mt-fg hover:underline"
      >
        Go to mood input
      </Link>
    </section>
  );
}

/* ---------- 3 张发现卡 ---------- */
function DiscoveryView({ tracks }: { tracks: Track[] }) {
  return (
    <section className="mx-auto max-w-[680px] py-6 md:py-10">
      <header className="mb-8">
        <BackToPlayer />
        <p className="text-eyebrow mt-6 text-mt-muted">Tonight&apos;s picks</p>
        <h1 className="text-display mt-3 text-[34px] text-mt-fg md:text-[44px]">
          Three songs
          <br />
          for your mood
        </h1>
        <p className="mt-3 text-[14px] text-mt-muted">
          Preview them here, then play wherever you like.
        </p>
      </header>

      <div className="flex flex-col gap-5">
        {tracks.map((track) => (
          <DiscoveryCard key={track.id} track={track} />
        ))}
      </div>

      {/* 产品定位 + 版权立场的明示 */}
      <p className="font-hand mx-auto mt-9 max-w-[440px] text-center text-[18px] leading-[1.5] text-mt-muted">
        MoodTune doesn&apos;t host music — we pick the songs, you choose where
        to play them.
      </p>
    </section>
  );
}

export default function DiscoverPage() {
  const { status, tracks } = useMoodSession();
  const playback = usePlayback();

  // 进入发现页 → 回到顶部，并暂停站内播放器（避免和 30s 试听抢声音）
  useEffect(() => {
    window.scrollTo(0, 0);
    if (playback.isPlaying) playback.toggle();
    // 仅在进入本页时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "done" && tracks.length > 0) {
    return <DiscoveryView tracks={tracks} />;
  }
  return <IdleView />;
}
