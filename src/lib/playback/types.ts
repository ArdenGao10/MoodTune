/*
 * 播放引擎抽象 —— 让上层(PlaybackProvider / 播放器 UI)不关心音频从哪来。
 * 目前实现:YouTubePlaybackEngine。
 * 未来可加:SpotifyPlaybackEngine(Web Playback SDK,Premium)、
 *           PreviewPlaybackEngine(<audio> + 30 秒试听)。
 */

export interface PlaybackEngine {
  /** 加载但不播放(用于预备当前曲目,可拿到时长) */
  cue(source: string): Promise<void>;
  /** 加载并立即播放 */
  loadAndPlay(source: string): Promise<void>;
  /** 从暂停处继续 */
  play(): void;
  pause(): void;
  /** 跳到指定秒数 */
  seek(seconds: number): void;
  /** 释放资源 */
  destroy(): void;

  /** 播放/暂停状态翻转时回调 */
  onStateChange: (playing: boolean) => void;
  /** 播放进度回调(均为秒) */
  onProgress: (positionSec: number, durationSec: number) => void;
  /** 当前曲目播放结束 */
  onEnded: () => void;
  /** 引擎错误(参数为引擎自有的错误码) */
  onError: (code: number) => void;
}
