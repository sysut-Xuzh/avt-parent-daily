"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeVoice } from "@/lib/voice-analysis";
import {
  markVoicePrintRegistered,
  markVoicePrintSkipped,
  setVoiceBaselineHz,
  getVoiceProfile,
} from "@/lib/recording-store";

/**
 * 声纹建档（方案 §3 首次登录引导）
 * - 邀请家长录制孩子 10–15 秒跟读语音（4–5 个示例词）
 * - 录音在家长端本地做声线分析，提取儿童声纹基准基频（f0ChildMean）
 * - 基准存本地（avt_voice_profile，永不外传）；原始音频不留存、不上传
 * - 跳过机制：孩子暂时不配合 → 标记为 skipped，使用通用儿童声线模型
 */
const SAMPLE_WORDS = ["爸爸", "妈妈", "抱抱", "苹果", "汽车"];

export default function VoicePrintSetup({
  open,
  onDone,
}: {
  open: boolean;
  onDone: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [baseline, setBaseline] = useState<number | null>(null);
  const [hasChildVoice, setHasChildVoice] = useState(false);
  const [error, setError] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const start = useCallback(async () => {
    try {
      setError("");
      setBaseline(null);
      chunks.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        if (blob.size < 500) {
          // 录音过短，基本是噪声/误触，提示重录
          setError("录音太短啦，请让宝宝跟读词语再试一次");
          return;
        }
        setAnalyzing(true);
        try {
          const result = await analyzeVoice(blob);
          setHasChildVoice(result.hasChildVoice);
          if (result.hasChildVoice && result.f0ChildMean > 0) {
            setBaseline(Math.round(result.f0ChildMean));
          }
        } catch {
          setError("分析失败，可重试或直接跳过");
        } finally {
          setAnalyzing(false);
        }
      };
      mediaRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError("无法访问麦克风，可先跳过");
    }
  }, []);

  const stop = useCallback(() => {
    mediaRef.current?.state !== "inactive" && mediaRef.current?.stop();
  }, []);

  const handleRegister = useCallback(() => {
    // 检测到儿童声线 → 写入个人化基准；否则仅标记「已注册」用通用模型
    if (hasChildVoice && baseline) {
      setVoiceBaselineHz(baseline, "completed");
    }
    markVoicePrintRegistered();
    onDone();
  }, [hasChildVoice, baseline, onDone]);

  const handleSkip = useCallback(() => {
    markVoicePrintSkipped();
    onDone();
  }, [onDone]);

  const resetState = useCallback(() => {
    setRecording(false);
    setAnalyzing(false);
    setBaseline(null);
    setHasChildVoice(false);
    setError("");
  }, []);

  if (!open) return null;

  const status = getVoiceProfile().voice_profile_status;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onDone}>
      <motion.div
        className="w-full max-w-md bg-white rounded-t-3xl p-5 pb-7 max-h-[90vh] overflow-y-auto"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-3" />
        <h3 className="text-base font-extrabold text-gray-800">🎙️ 录入宝宝声线（可选）</h3>
        <p className="text-[12px] text-gray-500 mt-1 leading-relaxed">
          请让宝宝跟读下面词语 10–15 秒，我们会在本机分析并记住 TA 的声音特征，让后续的参与度识别更准。声纹仅存本机、不上传。
        </p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {SAMPLE_WORDS.map((w) => (
            <span key={w} className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium">
              {w}
            </span>
          ))}
        </div>

        {status === "completed" && (
          <div className="mt-3 text-[11px] text-green-600 bg-green-50 rounded-lg px-3 py-2">
            ✅ 已录入声纹基线（{getVoiceProfile().child_voice_baseline_hz ? `${getVoiceProfile().child_voice_baseline_hz}Hz` : "通用模型"}），可重新录入覆盖。
          </div>
        )}

        <div className="mt-5 flex flex-col items-center">
          <AnimatePresence mode="wait">
            {!recording && !analyzing && baseline === null && (
              <motion.button key="start" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                onClick={start}
                className="w-20 h-20 rounded-full bg-indigo-500 text-white text-3xl flex items-center justify-center active:scale-95 shadow-md">
                🎙️
              </motion.button>
            )}
            {recording && (
              <motion.button key="stop" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                onClick={stop}
                className="w-20 h-20 rounded-full bg-red-500 text-white text-sm font-bold flex items-center justify-center active:scale-95 shadow-md">
                <span className="flex flex-col items-center">
                  <motion.span className="w-3 h-3 rounded-full bg-white" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                  停止
                </span>
              </motion.button>
            )}
            {analyzing && (
              <motion.div key="loading" initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-500 text-xs font-bold flex items-center justify-center">
                <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>🔄</motion.span>
              </motion.div>
            )}
            {!recording && !analyzing && baseline !== null && (
              <motion.div key="done" initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="w-20 h-20 rounded-full bg-green-500 text-white text-3xl flex items-center justify-center">
                ✅
              </motion.div>
            )}
          </AnimatePresence>
          <p className="text-[11px] text-gray-400 mt-2">
            {recording
              ? "正在录制…点击停止"
              : analyzing
              ? "本机分析中…"
              : baseline !== null
              ? `已识别宝宝声线（约 ${baseline}Hz）`
              : "点击开始（约 10–15 秒）"}
          </p>
          {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
        </div>

        {/* 结果：已识别 → 直接完成注册；未识别 → 提供「用通用模型」 */}
        {baseline !== null && !recording && !analyzing && (
          <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-100">
            <p className="text-[12px] text-green-700 font-medium">
              成功提取宝宝声纹基线：<b>{baseline}Hz</b>
            </p>
            <p className="text-[11px] text-gray-500 mt-1">后续任务/练习将以此为中心识别儿童声线。</p>
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={handleSkip}
            disabled={analyzing || recording}
            className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium active:scale-95 transition-all disabled:opacity-50"
          >
            跳过
          </button>
          {baseline !== null && !recording && !analyzing ? (
            <button
              onClick={handleRegister}
              className="flex-[2] py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold active:scale-95 transition-all"
            >
              完成注册
            </button>
          ) : (
            <button
              onClick={handleRegister}
              disabled={analyzing || recording}
              className="flex-[2] py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-bold active:scale-95 transition-all disabled:opacity-50"
            >
              {hasChildVoice ? "完成注册（通用模型）" : "稍后再说（用通用模型）"}
            </button>
          )}
        </div>

        {(baseline !== null || analyzing || recording) && (
          <button onClick={resetState} className="mt-2 w-full text-center text-[11px] text-gray-400 underline">
            重新录制
          </button>
        )}
      </motion.div>
    </div>
  );
}
