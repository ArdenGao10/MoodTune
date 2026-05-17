import type { Metadata } from "next";
import { Inter, Caveat } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { WeatherProvider } from "@/components/weather-provider";
import { MoodSessionProvider } from "@/components/mood-session-provider";
import { TopBar } from "@/components/layout/top-bar";

// 主字体 Inter，手写体 Caveat（DJ 签名 / 装饰文字）
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MoodTune — AI music for how you feel",
  description:
    "MoodTune turns your mood into a record. An AI music recommender with the loneliness of a late-night vinyl shop.",
};

// 防主题闪烁：首帧前依据 localStorage 设好 data-theme
const themeScript = `(function(){try{var t=localStorage.getItem('moodtune-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} ${caveat.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <WeatherProvider>
            <MoodSessionProvider>
              {/* 容器：手机 500px ｜ ≥768px 1600px */}
              <div className="mx-auto max-w-[500px] px-6 pb-20 pt-10 md:max-w-[1600px] md:px-20">
                <TopBar />
                <main>{children}</main>
              </div>
            </MoodSessionProvider>
          </WeatherProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
