/*
 * /login —— Spotify 登录入口。按钮直达 PKCE OAuth 路由。
 */

import { Disc3 } from "lucide-react";

export default function LoginPage() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <p className="text-eyebrow text-mt-muted">Connect</p>

      <h1 className="text-display mt-6 text-[56px] text-mt-fg md:text-[88px]">
        Sign in
      </h1>

      <p className="mt-6 max-w-md text-sm leading-relaxed text-mt-muted">
        MoodTune reads your listening history to learn your taste. Connect
        once — your moods do the rest.
      </p>

      <a
        href="/api/auth/spotify/login"
        className="mt-10 flex items-center gap-3 rounded-full border border-mt-strong px-8 py-3.5 text-mt-fg transition-colors duration-200 hover:bg-mt-fg hover:text-mt-bg"
      >
        <Disc3 className="size-5" strokeWidth={1.6} />
        <span className="text-[11px] font-medium uppercase tracking-[0.2em]">
          Connect Spotify
        </span>
      </a>

      <p className="mt-6 text-[10px] uppercase tracking-[0.15em] text-mt-faint">
        We never post on your behalf
      </p>
    </section>
  );
}
