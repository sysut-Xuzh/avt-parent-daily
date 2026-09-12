/**
 * 声线识别 + 参与度评分（家长端本地算法，原始音频不上传）
 * ------------------------------------------------------------------
 * 依据《AVT 三大优化方向执行方案》建议二：
 *  - 多特征融合区分儿童 / 成人声线（基频 F0 + 高频能量比）
 *  - 三级参与度评分：待提高 / 有效参与 / 完美参与
 *  - "完美参与" = 儿童声线紧随成人声线结束 2 秒内出现（模仿/跟读行为）
 *
 * 仅依赖浏览器 Web Audio API，所有计算在家长端完成。
 */

export type EngagementLevel = "low" | "medium" | "high";
export type EngagementStars = 1 | 2 | 3;

/**
 * 声线测试全站集成方案要求：全程用 ⭐1-5 星 替代 A/B/C/D 等级。
 * 因此 VoiceAnalysis 额外暴露：
 *  - starRating: 1-5（面向家长/日历/治疗师展示的统一星级）
 *  - voiceScore: 0-100（结构化评分，用于趋势图）
 * engagementStars(1-3) 保留作内部判定，starRating 由它 + 细粒度指标推导。
 */
export type StarRating = 1 | 2 | 3 | 4 | 5;

export interface VoiceFrame {
  start: number; // 秒（录音起点为 0）
  end: number;
  rms: number; // 帧能量
  f0: number; // 基频 Hz，0 表示清音/无
  isVoiced: boolean; // 是否含语音（能量阈值以上）
  isChild: boolean; // 是否判定为儿童声线
  isAdult: boolean; // 是否判定为成人声线
}

export interface VoiceAnalysis {
  duration: number; // 录音总时长（秒）
  sampleRate: number;
  totalFrames: number;
  voicedFrames: number;
  childFrames: number;
  adultFrames: number;
  f0Mean: number; // 全部有声帧平均 F0
  f0ChildMean: number; // 儿童帧平均 F0
  highFreqRatio: number; // 高频能量占比均值
  childVoiceRatio: number; // 儿童帧 / 有声帧
  hasChildVoice: boolean;
  confidence: number; // 声线检测置信度 0–1
  effectiveDuration: number; // 儿童有效发声时长（秒）
  firstChildVoiceAt: number | null; // 首次出现儿童声线的时刻（秒），用于"紧随"判定
  followLatency: number | null; // 紧随延迟（秒）
  isImitationFollow: boolean; // 是否构成"模仿/跟读"
  engagement: EngagementLevel;
  engagementStars: EngagementStars;
  starRating: StarRating; // 1-5 统一星级（方案要求代替 A/B/C/D）
  voiceScore: number; // 0-100 结构化评分（用于趋势图/治疗师端）
  suggestion: string; // 单题/单次建议话术
}

// ---------- 儿童声线判定阈值（方案 §2.3） ----------
const F0_CHILD_MIN = 250; // Hz
const F0_CHILD_MAX = 520; // Hz（儿童基频上限，含一定余量）
const F0_ADULT_MIN = 80; // Hz
const F0_ADULT_MAX = 250; // Hz
const F0_FLOOR = 70; // 低于此视为噪声/无
const F0_CEIL = 600; // 高于此视为非人声
const HIGH_FREQ_RATIO_CHILD = 0.32; // 高频能量占比阈值（儿童声音更亮）
const FOLLOW_WINDOW = 2.0; // “紧随”时间窗（秒）

// 儿童声线判定：F0 落在儿童区间，或 F0 偏高且高频能量占比大
// band 支持自适应：传入该儿童历史中位 F0 即可收窄/放宽判定带（Phase 3 自适应校准）
function classifyVoice(
  f0: number,
  highFreqRatio: number,
  band: { min: number; max: number }
): "child" | "adult" | "ambiguous" {
  if (f0 >= band.min && f0 <= band.max) return "child";
  if (f0 >= F0_ADULT_MIN && f0 < band.min) {
    // 成人区间，但若高频能量明显偏高，仍可能是儿童（稚嫩尖细声）
    if (highFreqRatio >= HIGH_FREQ_RATIO_CHILD && f0 >= 200) return "child";
    return "adult";
  }
  return "ambiguous";
}

// ---------- 自相关基频估计（YIN-lite） ----------
function estimateF0(frame: Float32Array, sampleRate: number): { f0: number; clarity: number } {
  const n = frame.length;
  const lagMin = Math.floor(sampleRate / F0_CEIL);
  const lagMax = Math.floor(sampleRate / F0_FLOOR);
  if (lagMax <= lagMin || lagMax >= n) return { f0: 0, clarity: 0 };

  // 去均值
  let mean = 0;
  for (let i = 0; i < n; i++) mean += frame[i];
  mean /= n;
  for (let i = 0; i < n; i++) frame[i] -= mean;

  // 自相关
  let bestLag = -1;
  let bestCorr = -Infinity;
  for (let lag = lagMin; lag <= lagMax; lag++) {
    let corr = 0;
    for (let i = 0; i + lag < n; i++) {
      corr += frame[i] * frame[i + lag];
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }
  // 归一化清晰度
  const energy = bestCorr > 0 ? bestCorr / (n - lagMax) : 0;
  if (bestLag <= 0) return { f0: 0, clarity: 0 };
  const f0 = sampleRate / bestLag;
  const clarity = Math.max(0, Math.min(1, energy));
  return { f0, clarity };
}

// 简易高频能量比：原始信号能量 - 低频平滑信号能量
function highFreqRatio(frame: Float32Array): number {
  const n = frame.length;
  let total = 0;
  for (let i = 0; i < n; i++) total += frame[i] * frame[i];
  // 一阶平滑（近似低通）
  const smoothed = new Float32Array(n);
  const a = 0.85;
  smoothed[0] = frame[0];
  for (let i = 1; i < n; i++) smoothed[i] = a * smoothed[i - 1] + (1 - a) * frame[i];
  let low = 0;
  for (let i = 0; i < n; i++) {
    const d = frame[i] - smoothed[i];
    low += d * d;
  }
  const tot = total || 1e-9;
  return Math.max(0, Math.min(1, low / tot));
}

function rms(frame: Float32Array): number {
  let s = 0;
  for (let i = 0; i < frame.length; i++) s += frame[i] * frame[i];
  return Math.sqrt(s / frame.length);
}

// ---------- 解码 Blob 为 AudioBuffer ----------
async function decodeBlob(blob: Blob): Promise<AudioBuffer | null> {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  const arr = await blob.arrayBuffer();
  const ctx = new Ctor();
  try {
    return await ctx.decodeAudioData(arr.slice(0));
  } catch {
    return null;
  } finally {
    if (ctx.state !== "closed") void ctx.close().catch(() => {});
  }
}

// ---------- 主分析函数 ----------
export async function analyzeVoice(
  blob: Blob,
  opts?: { adultEndTime?: number | null; childF0Median?: number | null } // 自适应阈值（该儿童历史中位 F0）
): Promise<VoiceAnalysis> {
  const empty: VoiceAnalysis = {
    duration: 0,
    sampleRate: 0,
    totalFrames: 0,
    voicedFrames: 0,
    childFrames: 0,
    adultFrames: 0,
    f0Mean: 0,
    f0ChildMean: 0,
    highFreqRatio: 0,
    childVoiceRatio: 0,
    hasChildVoice: false,
    confidence: 0,
    effectiveDuration: 0,
    firstChildVoiceAt: null,
    followLatency: null,
    isImitationFollow: false,
    engagement: "low",
    engagementStars: 1,
    starRating: 1,
    voiceScore: 0,
    suggestion: "宝贝今天似乎有点害羞，我们下次再试试～",
  };

  const buffer = await decodeBlob(blob);
  if (!buffer) return empty;

  const sr = buffer.sampleRate;
  const raw = buffer.getChannelData(0); // 取第一声道
  const N = raw.length;
  const duration = N / sr;

  const frameSize = 1024;
  const hop = 512;
  const totalFrames = Math.max(1, Math.floor((N - frameSize) / hop) + 1);

  // 先求全局最大能量，用于 VAD 阈值
  let maxRms = 1e-6;
  for (let f = 0; f < totalFrames; f++) {
    const start = f * hop;
    let s = 0;
    for (let i = start; i < start + frameSize && i < N; i++) s += raw[i] * raw[i];
    const r = Math.sqrt(s / frameSize);
    if (r > maxRms) maxRms = r;
  }
  const vadThresh = Math.max(maxRms * 0.12, 0.004);

  let voicedFrames = 0;
  let childFrames = 0;
  let adultFrames = 0;
  let f0Sum = 0;
  let f0ChildSum = 0;
  let hfSum = 0;
  let firstChildVoiceAt: number | null = null;
  let effectiveDuration = 0;

  // 自适应阈值：已有该儿童历史中位 F0 时，以其为中心收窄判定带（Phase 3）
  const band =
    opts?.childF0Median != null && opts.childF0Median > 0
      ? {
          min: Math.max(F0_FLOOR, opts.childF0Median * 0.6),
          max: Math.min(F0_CEIL, opts.childF0Median * 1.5),
        }
      : { min: F0_CHILD_MIN, max: F0_CHILD_MAX };

  for (let f = 0; f < totalFrames; f++) {
    const start = f * hop;
    const frame = raw.subarray(start, Math.min(start + frameSize, N));
    const frameRms = rms(frame);
    const tStart = start / sr;
    const tEnd = (start + frameSize) / sr;

    if (frameRms < vadThresh) continue; // 静音帧
    voicedFrames++;

    const hf = highFreqRatio(frame);
    hfSum += hf;
    const { f0, clarity } = estimateF0(frame.slice(), sr);

    let isChild = false;
    let isAdult = false;
    if (f0 >= F0_FLOOR && f0 <= F0_CEIL && clarity > 0.25) {
      const cls = classifyVoice(f0, hf, band);
      if (cls === "child") {
        isChild = true;
        childFrames++;
        f0ChildSum += f0;
        effectiveDuration += tEnd - tStart;
        if (firstChildVoiceAt === null) firstChildVoiceAt = tStart;
      } else if (cls === "adult") {
        isAdult = true;
        adultFrames++;
      }
    }
    f0Sum += f0;
  }

  const childVoiceRatio = voicedFrames > 0 ? childFrames / voicedFrames : 0;
  const hasChildVoice = childFrames > 0;
  const f0Mean = voicedFrames > 0 ? f0Sum / voicedFrames : 0;
  const f0ChildMean = childFrames > 0 ? f0ChildSum / childFrames : 0;
  const highFreqRatioMean = voicedFrames > 0 ? hfSum / voicedFrames : 0;
  const confidence = hasChildVoice
    ? Math.min(1, childFrames / 8)
    : Math.min(1, adultFrames / 8);

  // ---------- 参与度判定 ----------
  let engagement: EngagementLevel = "low";
  let stars: EngagementStars = 1;
  let suggestion = "宝贝今天似乎有点害羞，我们下次再试试～";

  if (hasChildVoice) {
    // 紧随判定：已知成人声线结束时刻 → 儿童声线在 2 秒内出现
    let followLatency: number | null = null;
    let isImitationFollow = false;
    if (opts?.adultEndTime != null && firstChildVoiceAt != null) {
      followLatency = Math.max(0, firstChildVoiceAt - opts.adultEndTime);
      isImitationFollow = followLatency <= FOLLOW_WINDOW;
    }
    if (isImitationFollow) {
      engagement = "high";
      stars = 3;
      suggestion = "完美跟读！宝贝的进步肉眼可见～";
    } else if (firstChildVoiceAt != null && firstChildVoiceAt <= FOLLOW_WINDOW) {
      // 录音开头 2 秒内即出现儿童声线（常见于模仿题：家长播完立即录）
      engagement = "high";
      stars = 3;
      suggestion = "完美跟读！宝贝的进步肉眼可见～";
    } else {
      engagement = "medium";
      stars = 2;
      suggestion = "太棒了！宝贝有在认真参与哦～";
    }
  }

  // ---------- 统一 1-5 星级 + 0-100 评分（声线测试全站集成方案） ----------
  const starRating = computeStarRating({
    hasChildVoice,
    effectiveDuration,
    childVoiceRatio,
    isImitationFollow:
      opts?.adultEndTime != null &&
      firstChildVoiceAt != null &&
      firstChildVoiceAt - opts.adultEndTime <= FOLLOW_WINDOW,
    firstChildVoiceAt,
  });
  const voiceScore = computeVoiceScore({
    hasChildVoice,
    effectiveDuration,
    childVoiceRatio,
    confidence,
    isImitationFollow:
      opts?.adultEndTime != null &&
      firstChildVoiceAt != null &&
      firstChildVoiceAt - opts.adultEndTime <= FOLLOW_WINDOW,
  });

  return {
    duration,
    sampleRate: sr,
    totalFrames,
    voicedFrames,
    childFrames,
    adultFrames,
    f0Mean,
    f0ChildMean,
    highFreqRatio: highFreqRatioMean,
    childVoiceRatio,
    hasChildVoice,
    confidence,
    effectiveDuration,
    firstChildVoiceAt,
    followLatency:
      opts?.adultEndTime != null && firstChildVoiceAt != null
        ? Math.max(0, firstChildVoiceAt - opts.adultEndTime)
        : null,
    isImitationFollow:
      opts?.adultEndTime != null &&
      firstChildVoiceAt != null &&
      firstChildVoiceAt - opts.adultEndTime <= FOLLOW_WINDOW,
    engagement,
    engagementStars: stars,
    starRating,
    voiceScore,
    suggestion,
  };
}

/**
 * 由参与度细粒度指标推导 1-5 星（方案要求统一星级，避免 A/B/C/D 伤自尊）。
 * 规则：未检测到儿童声线 → 1 星；检测到 ≥2 星起，按有效发声时长/占比/跟读行为递增到 5 星。
 */
function computeStarRating(input: {
  hasChildVoice: boolean;
  effectiveDuration: number;
  childVoiceRatio: number;
  isImitationFollow: boolean;
  firstChildVoiceAt: number | null;
}): StarRating {
  if (!input.hasChildVoice) return 1;
  let s = 2;
  if (input.effectiveDuration >= 1.5) s = 3;
  if (input.effectiveDuration >= 2.5 || input.childVoiceRatio >= 0.3) s = 4;
  if (input.isImitationFollow || (input.firstChildVoiceAt != null && input.firstChildVoiceAt <= 2.0)) s = 5;
  return s as StarRating;
}

/** 0-100 结构化评分，用于趋势图 / 治疗师端康复进展追踪。 */
function computeVoiceScore(input: {
  hasChildVoice: boolean;
  effectiveDuration: number;
  childVoiceRatio: number;
  confidence: number;
  isImitationFollow: boolean;
}): number {
  if (!input.hasChildVoice) return Math.round(Math.min(20, input.confidence * 20));
  let score = 40;
  score += Math.min(30, input.effectiveDuration * 12);
  score += Math.round(Math.min(20, input.childVoiceRatio * 20));
  if (input.isImitationFollow) score += 10;
  return Math.max(0, Math.min(100, score));
}

// ---------- 单题诚信提示（疑似代答） ----------
export function detectPossibleProxy(a: VoiceAnalysis): { proxySuspected: boolean; reason: string } {
  // 成人声线占比过高（>80%）且无儿童声线 → 疑似家长代答
  if (a.adultFrames > 0 && a.childFrames === 0 && a.voicedFrames > 0) {
    return { proxySuspected: true, reason: "本次录音中未检测到儿童声线，疑似家长代答，建议让孩子独立尝试" };
  }
  return { proxySuspected: false, reason: "" };
}
