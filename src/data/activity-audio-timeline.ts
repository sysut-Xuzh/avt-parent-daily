/**
 * AVT 32 个训练活动 — 分镜时间表（音画同步核心）
 *
 * 设计：每个活动动画固定 4 个分镜（开场/示范/等待/鼓励）
 * 统一时长：开场3s + 示范6s + 等待4s + 鼓励3s = 16s
 * 视频 onTimeUpdate → 查时间表 → 播放对应配音 + 字幕 + 环境音
 *
 * 音频文件约定存放：/animations/audio/{activityId}-shot{1-4}.mp3
 * 环境音约定存放：/animations/env/{envId}.mp3
 */

export interface AudioClip {
  id: string;
  activityId: string; // 关联活动 ID
  shotIndex: number; // 分镜 0-3
  startSec: number; // 视频内开始秒
  endSec: number;
  speech: string; // 该分镜台词（TTS/配音文本）
  audioUrl?: string; // 预录音频（可选，缺省用 speech 走 TTS）
  envAudio?: string; // 环境音（可选）
  subtitle: string; // 分镜步骤文字
}

export interface ActivityTimeline {
  activityId: string;
  clips: AudioClip[]; // 4 个分镜
}

/** 统一分镜时长：开场/示范/等待/鼓励 */
export const SHOT_TIMING = [3, 6, 4, 3];

/** 环境音库：活动场景 → 环境音文件 */
export const ENV_AUDIO: Record<string, string> = {
  "洗澡": "/animations/env/bath-water.mp3",
  "出门": "/animations/env/street.mp3",
  "睡前": "/animations/env/lullaby.mp3",
  "早餐": "/animations/env/kitchen.mp3",
  "游戏": "/animations/env/playful.mp3",
};

/**
 * 按活动 ID 生成 4 分镜时间表
 * @param activityId 活动 ID
 * @param speech 主台词（来自 task-speech.ts）
 * @param scene 场景（用于环境音）
 * @param steps 分镜步骤文字（4 条，来自 ACTIVITY_DISPLAY）
 */
export function buildTimeline(
  activityId: string,
  speech: string,
  scene: string,
  steps: string[]
): ActivityTimeline {
  const clips: AudioClip[] = [];
  let cursor = 0;
  const shotNames = ["开场", "示范", "等待", "鼓励"];

  for (let i = 0; i < 4; i++) {
    const dur = SHOT_TIMING[i];
    const start = cursor;
    const end = cursor + dur;
    cursor = end;

    // 台词分配：示范分镜(1)播主台词，开场(0)播提示语，等待(2)播引导，鼓励(3)播表扬
    let clipSpeech = speech;
    if (i === 0) clipSpeech = `我们一起来练${steps[0] ? "" : ""}吧`;
    if (i === 2) clipSpeech = "等一等，看看宝宝的反应";
    if (i === 3) clipSpeech = "太棒了！你做到了！";

    clips.push({
      id: `${activityId}-shot${i + 1}`,
      activityId,
      shotIndex: i,
      startSec: start,
      endSec: end,
      speech: clipSpeech,
      audioUrl: `/animations/audio/${activityId}-shot${i + 1}.mp3`,
      envAudio: i === 0 ? ENV_AUDIO[scene] : undefined, // 开场配环境音
      subtitle: steps[i] || shotNames[i],
    });
  }

  return { activityId, clips };
}

/**
 * 查询某个时间点命中的分镜
 */
export function findClipAt(
  timeline: ActivityTimeline | undefined,
  timeSec: number
): AudioClip | undefined {
  if (!timeline) return undefined;
  return timeline.clips.find((c) => timeSec >= c.startSec && timeSec < c.endSec);
}
