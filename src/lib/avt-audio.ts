/**
 * AVT 听力测试音频工具
 * - 察知 / 分辨 层级：用 Web Audio API 实时合成音调（避免依赖外部录音文件）
 * - 识别 / 理解 层级：用 Web Speech API 朗读中文词语 / 句子
 * 所有播放都受"最多重听 3 次"的业务逻辑约束（在页面层控制）。
 */

// ---------- 音调合成（察知 / 分辨） ----------
let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    audioCtx = new Ctor();
  }
  if (audioCtx.state === "suspended") {
    void audioCtx.resume();
  }
  return audioCtx;
}

export interface ToneSpec {
  /** 频率 Hz：决定音高（低音 ~250，高音 ~1000） */
  freq: number;
  /** 响度 0–1：决定大小声 */
  volume: number;
  /** 时长 秒：决定长短音 */
  duration: number;
  /** 波形，默认 sine 更柔和 */
  wave?: OscillatorType;
}

/** 播放一个柔和、无爆音的音调 */
export function playTone({ freq, volume, duration, wave = "sine" }: ToneSpec): Promise<void> {
  const ctx = getAudioCtx();
  if (!ctx) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    const peak = Math.min(Math.max(volume, 0), 1);
    // 缓入缓出，避免咔哒声
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.03);
    gain.gain.setValueAtTime(peak, now + Math.max(duration - 0.04, 0.03));
    gain.gain.linearRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
    osc.onended = () => resolve();
  });
}

// ---------- 语音合成（识别 / 理解） ----------
let zhVoice: SpeechSynthesisVoice | null = null;

/** 页面加载时调用一次，预选中文嗓音 */
export function loadVoices(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const pick = () => {
    const voices = window.speechSynthesis.getVoices();
    zhVoice =
      voices.find((v) => v.lang?.toLowerCase().startsWith("zh")) ||
      voices.find((v) => v.lang?.toLowerCase().startsWith("cmn")) ||
      null;
  };
  pick();
  if (!zhVoice && typeof window.speechSynthesis.onvoiceschanged !== "undefined") {
    window.speechSynthesis.onvoiceschanged = pick;
  }
}

export function cancelSpeech(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

/**
 * 朗读文本。返回 Promise<boolean>：true 表示成功调用语音合成，
 * false 表示当前环境不支持语音（页面层应回退为文字提示）。
 */
export function speak(text: string, opts?: { rate?: number; pitch?: number }): Promise<boolean> {
  if (typeof window === "undefined" || !window.speechSynthesis) return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    if (zhVoice) u.voice = zhVoice;
    else u.lang = "zh-CN";
    u.rate = opts?.rate ?? 0.9; // 稍慢，适合低幼儿童
    u.pitch = opts?.pitch ?? 1.15; // 稍高，更亲切
    let settled = false;
    u.onend = () => {
      if (!settled) {
        settled = true;
        resolve(true);
      }
    };
    u.onerror = () => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    // 兜底：部分浏览器 onend 不触发
    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(true);
      }
    }, 6000);
  });
}
