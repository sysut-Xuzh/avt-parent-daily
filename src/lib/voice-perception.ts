// 语音感知（阶段四 · D 默认开）
// ---------------------------------------------------------------
// getUserMedia(audio) → AnalyserNode → 实时 RMS 音量；
// 判定「孩子发声」：音量相对环境基线突增并持续 >N ms（区别于环境噪声）；
// 命中即回调 onVocalization()。全程本地处理，不上传。
//
// 复用既有录音能力（recording-store / Web Audio），不重复造轮子。

export type VoicePerceptionError = "not-supported" | "no-mic" | "denied" | "unknown";

export class VoicePerceptionUnsupportedError extends Error {
  code: VoicePerceptionError;
  constructor(code: VoicePerceptionError, message: string) {
    super(message);
    this.name = "VoicePerceptionUnsupportedError";
    this.code = code;
  }
}

export interface VoicePerceptionOptions {
  /** 发声判定：瞬时 RMS 超过基线多少倍算「突增」（默认 2.2） */
  riseFactor?: number;
  /** 持续多久算一次有效发声（ms，默认 220） */
  minVocalMs?: number;
  /** 一次发声后冷却时间（ms，默认 1200），避免重复触发 */
  cooldownMs?: number;
  /** 环境基线采集时长（ms，默认 1200） */
  baselineMs?: number;
  /** 实时音量回调（rms 0~1，baseline 同量纲） */
  onLevel?: (rms: number, baseline: number) => void;
  /** 检测到一次「孩子发声」回调 */
  onVocalization?: () => void;
}

export interface VoicePerceptionHandle {
  stop: () => void;
}

// 计算一段时域数据的 RMS（线性，0~1 近似）
function computeRms(samples: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = (samples[i] - 128) / 128; // 中心化到 -1~1
    sum += v * v;
  }
  return Math.sqrt(sum / samples.length);
}

export async function startVoicePerception(
  opts: VoicePerceptionOptions = {}
): Promise<VoicePerceptionHandle> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    throw new VoicePerceptionUnsupportedError("not-supported", "当前环境不支持语音感知");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new VoicePerceptionUnsupportedError("not-supported", "浏览器不支持麦克风采集");
  }

  const riseFactor = opts.riseFactor ?? 2.2;
  const minVocalMs = opts.minVocalMs ?? 220;
  const cooldownMs = opts.cooldownMs ?? 1200;
  const baselineMs = opts.baselineMs ?? 1200;

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e: unknown) {
    const err = e as DOMException;
    if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
      throw new VoicePerceptionUnsupportedError("denied", "麦克风权限被拒绝");
    }
    if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
      throw new VoicePerceptionUnsupportedError("no-mic", "未检测到麦克风");
    }
    throw new VoicePerceptionUnsupportedError("unknown", err?.message || "麦克风打开失败");
  }

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    stream.getTracks().forEach((t) => t.stop());
    throw new VoicePerceptionUnsupportedError("not-supported", "浏览器不支持 Web Audio");
  }

  const audioCtx = new AudioCtx();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0.6;
  source.connect(analyser);

  const buf = new Uint8Array(analyser.fftSize);

  let stopped = false;
  let baseline = 0;
  let baselineSamples = 0;
  let baselineSum = 0;
  const baselineStart = performance.now();

  let vocalStart = 0;
  let inVocal = false;
  let lastFire = 0;
  let rafId = 0;

  const loop = () => {
    if (stopped) return;
    analyser.getByteTimeDomainData(buf);
    const rms = computeRms(buf);

    const now = performance.now();
    // 基线采集阶段
    if (now - baselineStart < baselineMs) {
      baselineSum += rms;
      baselineSamples += 1;
      baseline = baselineSamples > 0 ? baselineSum / baselineSamples : 0.001;
    } else {
      // 稳定基线（留一点底噪余量）
      baseline = Math.max(baseline, 0.012);
    }

    opts.onLevel?.(rms, baseline);

    // 发声检测：瞬时音量超过基线 riseFactor 倍
    const isLoud = rms > baseline * riseFactor && rms > 0.02;
    if (isLoud && !inVocal) {
      inVocal = true;
      vocalStart = now;
    } else if (isLoud && inVocal) {
      if (now - vocalStart >= minVocalMs && now - lastFire > cooldownMs) {
        lastFire = now;
        inVocal = false; // 一次性触发后重置，等下次上升沿
        opts.onVocalization?.();
      }
    } else if (!isLoud) {
      inVocal = false;
    }

    rafId = requestAnimationFrame(loop);
  };
  rafId = requestAnimationFrame(loop);

  return {
    stop: () => {
      if (stopped) return;
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      try {
        source.disconnect();
        audioCtx.close();
      } catch {
        /* 忽略关闭异常 */
      }
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}
