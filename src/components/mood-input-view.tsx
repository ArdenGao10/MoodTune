"use client";

/*
 * <MoodInputView /> —— 多模态情绪输入界面。
 * 共享于 /mood-input 与 /discover：唱片 + 提示语 + 四种情绪输入 + PLAY。
 */

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Vinyl } from "@/components/vinyl";
import { RoughButton } from "@/components/rough-button";
import { MoodTagPill } from "@/components/mood-tag-pill";
import { VibePicker } from "@/components/vibe-picker";
import { ImageDropzone } from "@/components/image-dropzone";
import { useMoodSession } from "@/components/mood-session-provider";

const MOODS = [
  "Melancholy",
  "Energized",
  "Focused",
  "Nostalgic",
  "Restless",
  "Tender",
  "Numb",
  "Playful",
  "Anxious",
  "Content",
];
const MAX_MOODS = 3;

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.25em] text-mt-muted">
      {children}
    </p>
  );
}

export function MoodInputView() {
  const router = useRouter();
  const { startRecommendation } = useMoodSession();

  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [moodText, setMoodText] = useState("");
  const [colorEmoji, setColorEmoji] = useState("");
  const [weatherEmoji, setWeatherEmoji] = useState("");
  const [image, setImage] = useState<string | null>(null);

  const hasInput =
    moodTags.length > 0 ||
    moodText.trim() !== "" ||
    colorEmoji !== "" ||
    weatherEmoji !== "" ||
    image !== null;

  function toggleMood(mood: string) {
    setMoodTags((prev) =>
      prev.includes(mood)
        ? prev.filter((m) => m !== mood)
        : prev.length < MAX_MOODS
          ? [...prev, mood]
          : prev,
    );
  }

  function handlePlay() {
    if (!hasInput) return;
    startRecommendation({
      moodTags,
      moodText: moodText.trim(),
      colorEmoji,
      weatherEmoji,
      imageBase64: image ?? undefined,
    });
    router.push("/recommendations");
  }

  return (
    <div className="flex flex-col items-center pt-6 md:pt-10">
      <Vinyl size={260} isPlaying={false} className="mb-7" />
      <p className="font-hand text-[24px] text-mt-muted">
        tell me how you feel...
      </p>

      <div className="mt-12 w-full max-w-[900px] md:grid md:grid-cols-2 md:gap-x-16 md:gap-y-12">
        <section className="mb-10 md:mb-0">
          <SectionTitle>Pick up to 3 moods</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((mood) => (
              <MoodTagPill
                key={mood}
                label={mood}
                selected={moodTags.includes(mood)}
                disabled={moodTags.length >= MAX_MOODS}
                onClick={() => toggleMood(mood)}
              />
            ))}
          </div>
        </section>

        <section className="mb-10 md:mb-0">
          <SectionTitle>Or, in your own words</SectionTitle>
          <input
            type="text"
            maxLength={80}
            value={moodText}
            onChange={(e) => setMoodText(e.target.value)}
            placeholder="just finished a long call, sky is gray..."
            aria-label="Describe your mood"
            className="w-full border-b border-mt-stroke bg-transparent py-3 text-[15px] text-mt-fg placeholder:italic placeholder:text-mt-faint focus:border-mt-strong focus:outline-none"
          />
        </section>

        <section className="mb-10 md:mb-0">
          <SectionTitle>Pick a vibe</SectionTitle>
          <VibePicker
            color={colorEmoji}
            weather={weatherEmoji}
            onColorChange={setColorEmoji}
            onWeatherChange={setWeatherEmoji}
          />
        </section>

        <section>
          <SectionTitle>Show me what you see</SectionTitle>
          <ImageDropzone value={image} onChange={setImage} />
        </section>
      </div>

      <div className="mt-16 flex flex-col items-center gap-3">
        <RoughButton
          size={120}
          accentHover
          disabled={!hasInput}
          onClick={handlePlay}
          aria-label="Find my songs"
        >
          <span className="text-[12px] font-medium uppercase tracking-[0.25em]">
            Play
          </span>
        </RoughButton>
        {!hasInput && (
          <p className="text-[10px] uppercase tracking-[0.15em] text-mt-faint">
            Add at least one feeling
          </p>
        )}
      </div>
    </div>
  );
}
