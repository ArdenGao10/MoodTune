"use client";

/*
 * /recommendations —— 推荐结果页。
 *  loading：唱片加速旋转 + "Picking your songs..."
 *  done：主播放区显示 recommendations[activeIndex]，下方卡片为其余推荐，点击切换
 *  error：友好错误文案 + 重试
 *  idle：直接进入（无会话）→ 引导回首页
 */

import { type ReactNode } from "react";
import Link from "next/link";
import {
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { Vinyl } from "@/components/vinyl";
import { RoughButton } from "@/components/rough-button";
import { WaveProgressBar } from "@/components/wave-progress-bar";
import { useMoodSession } from "@/components/mood-session-provider";
import { usePlayback } from "@/contexts/PlaybackContext";
import type { Recommendation } from "@/lib/types";

/** 秒 → m:ss */
function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// 透明描边的次级控件按钮
function ControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center text-mt-muted transition-colors hover:text-mt-fg"
    >
      {children}
    </button>
  );
}

/* ---------- loading ---------- */
function LoadingView() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-8 py-16">
      <div className="w-[240px] md:w-[300px]">
        <Vinyl isPlaying spinSeconds={2.4} />
      </div>
      <p className="font-hand text-[26px] text-mt-muted">
        Picking your songs...
      </p>
    </section>
  );
}

/* ---------- error ---------- */
function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 py-16 text-center">
      <p className="text-display text-[40px] text-mt-fg md:text-[56px]">
        {message}
      </p>
      <div className="mt-2 flex flex-col items-center gap-3">
        <RoughButton size={96} onClick={onRetry} aria-label="Try again">
          <span className="text-[11px] font-medium uppercase tracking-[0.2em]">
            Retry
          </span>
        </RoughButton>
        <Link
          href="/"
          className="text-eyebrow text-mt-muted underline-offset-4 hover:text-mt-fg hover:underline"
        >
          Back to mood
        </Link>
      </div>
    </section>
  );
}

/* ---------- idle (直接进入) ---------- */
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

/* ---------- 推荐卡片 ---------- */
function RecCard({
  rec,
  index,
  onSelect,
}: {
  rec: Recommendation;
  index: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-start gap-4 rounded-xl border border-mt-stroke p-4 text-left transition-colors hover:border-mt-strong"
    >
      <span className="text-display shrink-0 text-[22px] text-mt-faint">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold uppercase tracking-[-0.01em] text-mt-fg">
          {rec.title}
        </span>
        <span className="text-artist mt-1 block truncate text-[11px] text-mt-muted">
          {rec.artist}
        </span>
        <span className="mt-2 block text-[12px] italic leading-snug text-mt-muted">
          {rec.note}
        </span>
      </span>
    </button>
  );
}

/* ---------- 主播放区 + 卡片列表 ---------- */
function PlayerView({
  recommendations,
  activeIndex,
  setActiveIndex,
}: {
  recommendations: Recommendation[];
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}) {
  const {
    isPlaying,
    positionSec,
    durationSec,
    status,
    toggle,
    next,
    prev,
    seekFraction,
  } = usePlayback();
  const active = recommendations[activeIndex];
  const progress = durationSec > 0 ? positionSec / durationSec : 0;
  const rest = recommendations
    .map((rec, index) => ({ rec, index }))
    .filter((entry) => entry.index !== activeIndex);

  return (
    <div>
      {/* 播放器 —— 桌面端 section 锁 80vh 并整体横向 + 垂直居中：
          - justify-center 让"唱片 + 内容"两列作为一个整体在容器内横向居中
          - items-center 让两列在 80vh 内垂直居中（中线对齐）
          - 两列都不用 flex-1，按各自固有/最大宽度排，避免一列被撑大、整体偏左 */}
      <section className="md:flex md:min-h-[80vh] md:items-center md:justify-center md:gap-[100px] min-[1400px]:gap-[120px]">
        <div className="mb-12 flex justify-center md:mb-0 md:shrink-0">
          <div className="w-[360px] max-w-full md:w-[480px] min-[1400px]:w-[540px]">
            <Vinyl isPlaying={isPlaying} />
          </div>
        </div>

        <div className="flex w-full flex-col md:w-[600px] md:max-w-[600px] md:justify-center md:self-stretch">
          <div className="mb-7 md:mb-10">
            <p className="text-eyebrow mb-3 text-mt-muted">
              {active.moodTag}
            </p>
            <h1 className="text-display break-words text-[40px] text-mt-fg md:text-[60px] min-[1400px]:text-[72px]">
              {active.title}
            </h1>
            <p className="text-artist mb-6 mt-3.5 text-[13px] text-mt-muted">
              {active.artist}
            </p>
            <div className="border-l border-mt-stroke pl-[18px]">
              <p className="text-[15px] italic leading-[1.65] text-mt-fg md:text-[17px]">
                {active.note}
              </p>
              <p className="font-hand mt-1.5 pr-2 text-right text-[19px] text-mt-muted">
                — DJ
              </p>
            </div>
          </div>

          <div className="my-5 md:my-7">
            <button
              type="button"
              aria-label="Seek"
              className="block w-full"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                seekFraction((e.clientX - rect.left) / rect.width);
              }}
            >
              <WaveProgressBar
                progress={progress}
                currentTime={formatTime(positionSec)}
                totalTime={durationSec > 0 ? formatTime(durationSec) : "--:--"}
              />
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between md:justify-center md:gap-7">
            <ControlButton label="Shuffle">
              <Shuffle className="size-5" strokeWidth={1.6} />
            </ControlButton>
            <ControlButton label="Previous track" onClick={prev}>
              <SkipBack className="size-5" strokeWidth={1.6} />
            </ControlButton>
            <RoughButton
              variant="solid"
              size={64}
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={toggle}
            >
              {isPlaying ? (
                <Pause className="size-5 fill-current" />
              ) : (
                <Play className="size-5 fill-current" />
              )}
            </RoughButton>
            <ControlButton label="Next track" onClick={next}>
              <SkipForward className="size-5" strokeWidth={1.6} />
            </ControlButton>
            <ControlButton label="Repeat">
              <Repeat className="size-5" strokeWidth={1.6} />
            </ControlButton>
          </div>

          {/* 播放状态提示 —— 找曲 / 找不到 */}
          {status === "resolving" && !isPlaying && (
            <p className="mt-3 text-center text-[12px] text-mt-muted">
              Finding the track…
            </p>
          )}
          {status === "error" && (
            <p className="mt-3 text-center text-[12px] text-mt-muted">
              Couldn&apos;t find this one to stream — skip to the next.
            </p>
          )}
        </div>
      </section>

      {/* 其余推荐 */}
      <div className="mt-[70px] border-t border-dashed border-mt-stroke pt-10">
        <p className="mb-5 text-[10px] uppercase tracking-[0.25em] text-mt-muted">
          Up next — tap to play
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {rest.map(({ rec, index }) => (
            <RecCard
              key={`${rec.title}-${index}`}
              rec={rec}
              index={index}
              onSelect={() => setActiveIndex(index)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  const { status, recommendations, activeIndex, error, setActiveIndex, retry } =
    useMoodSession();

  if (status === "loading") return <LoadingView />;
  if (status === "error") {
    return (
      <ErrorView
        message={error ?? "The DJ needs a moment. Try again?"}
        onRetry={retry}
      />
    );
  }
  if (status === "done" && recommendations.length > 0) {
    return (
      <PlayerView
        recommendations={recommendations}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
      />
    );
  }
  return <IdleView />;
}
