# MoodTune

![MoodTune home]([public/screenshots/home.png](https://github.com/user-attachments/assets/f2141573-334c-4196-bc68-4be286d778e9))

> Tell it how you feel tonight. An AI DJ picks three songs, plays them in-app, and hands you a one-tap jump to whichever music app you actually use.

## What it is

MoodTune is a small, hand-drawn music room with two things bolted together:

1. **An AI DJ that reads the room.** Zhipu GLM takes your mood input — tags, a free-text note, an inner-weather vibe, even a photo of what's in front of you — folds in local weather and your recent history, and returns three songs framed as tonight's "record." Not a 50-track playlist. Three.
2. **A player that just works, plus an escape hatch to your own apps.** Each track resolves through YouTube and plays inside MoodTune (vinyl spin, waveform progress, prev/next, seek). If you'd rather hear it on Spotify, Apple Music, YouTube Music, NetEase, or QQ Music, every song has a one-tap deep link to that platform — opening the matched track when we can, falling back to a search when we can't.

Sign in with Spotify and two extra things light up: recommendations get matched against the Spotify catalog (so the deep link goes straight to the track page), and you can save any song to your Liked Songs without leaving MoodTune.

## Features

- **Multimodal mood input** — pick up to 3 emotion tags, write a sentence, choose a color + weather vibe, or drop a photo. Mix any of them.
- **AI DJ** — Zhipu GLM (OpenAI-compatible API) reads the mood, the local weather, and your listening history, and returns three curated songs with a short DJ note for each.
- **Built-in player** — YouTube-backed playback engine resolves each "title + artist" into a candidate list, plays the first one that works, and silently skips embed-blocked / region-locked results so "Couldn't find this one" is rare.
- **Cross-platform jump** — one-tap links to Spotify · Apple Music · YouTube Music · NetEase · QQ Music. Deep-link to the matched track when possible, search fallback otherwise.
- **Spotify integration (optional)** — log in to deep-link to the exact Spotify track and save songs to your Liked library.
- **Ambient awareness** — the top bar shows live OpenWeatherMap conditions and feeds them into the recommendation prompt.
- **Mood calendar & recap** — every logged night is pressed into a calendar tile; the monthly recap mixes a whole month onto one side.
- **Hand-drawn visuals** — record and waveform animations built with roughjs + Framer Motion, with light/dark theme switching.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling**: Tailwind CSS v4 + Radix UI + shadcn
- **Animation**: Framer Motion, roughjs
- **AI**: Zhipu GLM via the `openai` SDK against the OpenAI-compatible endpoint
- **Data sources**: Spotify Web API, YouTube Data API v3, OpenWeatherMap
- **Hosting**: Vercel

## Local Development

### 1. Requirements

- Node.js ≥ 20
- npm / pnpm / yarn
- A network proxy for external APIs (recommended inside mainland China)

### 2. Install

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

| Variable | Purpose | Where to get it |
| --- | --- | --- |
| `ZHIPUAI_API_KEY` | Recommendation engine | https://open.bigmodel.cn |
| `OPENWEATHER_API_KEY` | Top-bar weather | https://openweathermap.org/api |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Login + full-track playback | https://developer.spotify.com/dashboard |
| `SPOTIFY_REDIRECT_URI` | OAuth callback (must match Dashboard exactly) | Defaults to `http://127.0.0.1:3000/api/auth/spotify/callback` |
| `YOUTUBE_API_KEY` | Resolve "track + artist" into a playable video | https://console.cloud.google.com |

> Spotify no longer accepts `localhost`. Use `127.0.0.1` for local development.

### 4. Run

```bash
npm run dev      # http://127.0.0.1:3000
npm run build
npm run start
npm run lint
```

The `dev` script ships with `HTTP_PROXY` / `HTTPS_PROXY` baked in (`127.0.0.1:7897`); adjust [package.json](package.json) if you don't need them.

## Credits

- Recommendation engine: [Zhipu AI](https://open.bigmodel.cn) (GLM-5.1 for text, GLM-4.5v for images)
- Playback: [Spotify Web API](https://developer.spotify.com) · [YouTube Data API](https://developers.google.com/youtube/v3)
- Weather: [OpenWeatherMap](https://openweathermap.org)
- Hand-drawn rendering: [roughjs](https://roughjs.com)
- Motion: [Framer Motion](https://www.framer.com/motion/)
- UI primitives: [Radix UI](https://www.radix-ui.com) · [shadcn/ui](https://ui.shadcn.com)

## License

MIT © [ArdenGao10](https://github.com/ArdenGao10)

This code is provided for study and reference only. **Commercial use without permission is prohibited.**
