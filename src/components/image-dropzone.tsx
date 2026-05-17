"use client";

/*
 * <ImageDropzone /> —— 情绪输入 D：「SHOW ME WHAT YOU SEE」。
 * 手绘虚线框拖拽上传区，jpg/png、5MB 上限，上传后显示缩略图。
 */

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png"];

export interface ImageDropzoneProps {
  /** 已上传图片的 data URL */
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

export function ImageDropzone({ value, onChange }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File | undefined | null) {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      setError("JPG or PNG only");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be under 5MB");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () =>
      onChange(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  if (value) {
    return (
      <div className="relative inline-block">
        {/* data URL 缩略图 —— next/image 无法优化 data URL */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value}
          alt="Your moment"
          className="size-28 rounded-xl border border-mt-stroke object-cover"
        />
        <button
          type="button"
          aria-label="Remove photo"
          onClick={() => {
            onChange(null);
            setError(null);
          }}
          className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full border border-mt-strong bg-mt-bg text-mt-fg transition-colors hover:bg-mt-fg hover:text-mt-bg"
        >
          <X className="size-3.5" strokeWidth={2} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center transition-colors",
          dragOver
            ? "border-mt-strong bg-mt-stroke/10"
            : "border-mt-stroke hover:border-mt-strong",
        )}
      >
        <ImagePlus className="size-6 text-mt-muted" strokeWidth={1.5} />
        <span className="text-[13px] text-mt-muted">
          Drop a photo of this moment
        </span>
        <span className="text-[10px] uppercase tracking-[0.15em] text-mt-faint">
          JPG / PNG · 5MB
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && <p className="mt-2 text-[11px] text-mt-muted">{error}</p>}
    </div>
  );
}
