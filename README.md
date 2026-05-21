# MoodTune

> 把当下的心情翻译成一张唱片 —— 一个面向「音乐发现」的 AI 推荐层。

MoodTune 不是又一个流媒体播放器,而是叠在 Spotify / YouTube 之上的一层「DJ」:你描述心情、场景或天气,它从海量曲库里挑出最贴合此刻的几首歌,并用唱片化的视觉语言把推荐过程演成一段小仪式。

## 主要特性

- **心情输入**:支持文字、表情标签、图片三种方式描述当前氛围。
- **AI 推荐引擎**:接入智谱 GLM(OpenAI 兼容协议),基于心情、位置、天气与历史偏好生成歌单。
- **多源播放**:登录 Spotify 后可直接全曲播放;未登录则回退到 30 秒预览或 YouTube 解析播放。
- **环境感知**:顶栏集成 OpenWeatherMap 实时天气,作为推荐输入维度之一。
- **听歌足迹**:本地保存推荐历史与回顾(Recap),支持时间线浏览。
- **手绘视觉**:基于 roughjs + Framer Motion 的唱片 / 波形动画,深浅主题自动切换。

## 技术栈

- **框架**:Next.js 16(App Router)+ React 19 + TypeScript 5
- **样式**:Tailwind CSS v4 + Radix UI + shadcn
- **动效**:Framer Motion、roughjs
- **AI**:智谱 GLM(通过 `openai` SDK 调用 OpenAI 兼容端点)
- **数据源**:Spotify Web API、YouTube Data API v3、OpenWeatherMap

## 快速开始

### 1. 环境要求

- Node.js ≥ 20
- npm / pnpm / yarn 任选其一
- 访问外部 API 的网络代理(国内环境推荐)

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制示例文件并填入密钥:

```bash
cp .env.example .env.local
```

需要申请的密钥:

| 变量 | 用途 | 申请地址 |
| --- | --- | --- |
| `ZHIPUAI_API_KEY` | 推荐引擎 | https://open.bigmodel.cn |
| `OPENWEATHER_API_KEY` | 顶栏天气 | https://openweathermap.org/api |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | 登录与全曲播放 | https://developer.spotify.com/dashboard |
| `SPOTIFY_REDIRECT_URI` | OAuth 回调,需与 Dashboard 完全一致 | 默认 `http://127.0.0.1:3000/api/auth/spotify/callback` |
| `YOUTUBE_API_KEY` | 把「歌名 + 歌手」解析为可播放视频 | https://console.cloud.google.com |

> Spotify 已不再允许 `localhost`,本地开发请统一使用 `127.0.0.1`。

### 4. 启动开发服务器

```bash
npm run dev
```

默认监听 `http://127.0.0.1:3000`。`dev` 脚本里内置了 HTTP/HTTPS 代理变量(`127.0.0.1:7897`),如不需要请按需修改 [package.json](package.json)。

### 5. 生产构建

```bash
npm run build
npm run start
```

## 目录结构

```
src/
├── app/                  # Next.js App Router
│   ├── api/              # 服务端路由:推荐 / 天气 / 地理编码 / Spotify / YouTube
│   ├── mood-input/       # 心情输入页
│   ├── recommendations/  # 推荐结果页
│   ├── discover/         # 发现 / 浏览
│   ├── history/          # 听歌历史
│   ├── recap/            # 周期回顾
│   └── login/            # Spotify 登录入口
├── components/           # UI 组件(唱片、波形、卡片等)
├── contexts/             # 全局 Context:播放、音源、预览
└── lib/                  # 业务逻辑:智谱客户端、Spotify/YouTube 适配、历史持久化
```

## 主要页面路径

| 路径 | 说明 |
| --- | --- |
| `/` | 封面 |
| `/mood-input` | 心情输入(文字 / 标签 / 图片) |
| `/recommendations` | 推荐结果与播放 |
| `/discover` | 发现页 |
| `/history` | 历史记录 |
| `/recap` | 听歌回顾 |
| `/login` | Spotify 授权 |

## 开发约定

- 项目使用的是当前版本的 Next.js,API、约定与文件结构可能与历史版本不同,改动前请参考 [AGENTS.md](AGENTS.md) 与 `node_modules/next/dist/docs/`。
- ESLint 配置见 [eslint.config.mjs](eslint.config.mjs),提交前请运行:

  ```bash
  npm run lint
  ```

## License
MIT © [ArdenGao10](https://github.com/ArdenGao10)

本项目代码仅供学习交流使用，**禁止未经许可用于商业用途**。
