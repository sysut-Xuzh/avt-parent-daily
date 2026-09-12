"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeVoice, detectPossibleProxy, type VoiceAnalysis } from "@/lib/voice-analysis";
import {
  saveRecording,
  hasVoiceConsent,
  setVoiceConsent,
  listRecordings,
} from "@/lib/recording-store";
import { recognizeTargetWord, type AsrResult } from "@/lib/asr";
import RecordingConsentModal from "./RecordingConsentModal";

type Phase = "idle" | "recording" | "recorded" | "analyzing" | "result" | "error";

const ENGAGEMENT_META: Record<
  VoiceAnalysis["engagement"],
  { label: string; color: string; bg: string; emoji: string }
> = {
  low: { label: "待提高", color: "text-amber-600", bg: "bg-amber-50", emoji: "⭐" },
  medium: { label: "有效参与", color: "text-green-600", bg: "bg-green-50", emoji: "⭐⭐" },
  high: { label: "完美参与", color: "text-indigo-600", bg: "bg-indigo-50", emoji: "⭐⭐⭐" },
};

/**
 * 本地录音 + 声线分析 + 参与度报告（方案建议二 / Phase 1）
 * - 手动录音（点击开始/停止，按住亦可）
 * - 回放确认 → 重录 / 跳过
 * - 提交后本地分析，绝不调用上传接口
 * - 首次使用弹出隐私单独同意
 */
export default function VoiceRecorder({
  adultEndTime = null,
  taskId,
  targetWord,
  onComplete,
  onSkip,
  onClose,
}: {
  adultEndTime?: number | null;
  taskId?: string;
  targetWord?: string;
  onComplete?: (analysis: VoiceAnalysis, blob: Blob) => void;
  onSkip?: () => void;
  onClose?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [duration, setDuration] = useState(0);
  const [fileUrl, setFileUrl] = useState("");
  const [blob, setBlob] = useState<Blob | null>(null);
  const [analysis, setAnalysis] = useState<VoiceAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showConsent, setShowConsent] = useState(false);
  const [proxyWarn, setProxyWarn] = useState("");
  const [asr, setAsr] = useState<AsrResult | null>(null);
  const [adaptive, setAdaptive] = useState(false);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const ensureConsent = useCallback((): boolean => {
    if (hasVoiceConsent()) return true;
    setShowConsent(true);
    return false;
  }, []);

  const startRecording = useCallback(async () => {
    if (!ensureConsent()) return;
    try {
      setErrorMsg("");
      chunks.current = [];
      setDuration(0);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        clearInterval(timer.current);
        const b = new Blob(chunks.current, { type: "audio/webm" });
        setBlob(b);
        setFileUrl(URL.createObjectURL(b));
        setPhase("recorded");
      };
      mediaRef.current = rec;
      rec.start(200);
      setPhase("recording");
      let sec = 0;
      timer.current = setInterval(() => {
        sec++;
        setDuration(sec);
        if (sec >= 60) rec.stop();
      }, 1000);
    } catch (err: unknown) {
      setPhase("error");
      setErrorMsg(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "请在浏览器中允许麦克风权限"
          : "无法访问麦克风"
      );
    }
  }, [ensureConsent]);

  const stopRecording = useCallback(() => {
    mediaRef.current?.state !== "inactive" && mediaRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setDuration(0);
    setBlob(null);
    setFileUrl("");
    setAnalysis(null);
    setProxyWarn("");
    setAsr(null);
    setAdaptive(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, []);

  const togglePlayback = useCallback(() => {
    if (!fileUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      return;
    }
    const a = new Audio(fileUrl);
    audioRef.current = a;
    a.play();
  }, [fileUrl]);

  const submit = useCallback(async () => {
    if (!blob) return;
    setPhase("analyzing");
    setAsr(null);

    // 自适应校准：取该儿童历史录音的中位儿童基频，收窄判定带（Phase 3）
    let childF0Median: number | null = null;
    try {
      const history = (await listRecordings()).filter(
        (r) => r.analysis.f0ChildMean > 0
      );
      if (history.length >= 3) {
        const vals = history
          .map((r) => r.analysis.f0ChildMean)
          .sort((a, b) => a - b);
        childF0Median = vals[Math.floor(vals.length / 2)];
        setAdaptive(true);
      }
    } catch {
      /* 忽略，走默认阈值 */
    }

    const result = await analyzeVoice(blob, { adultEndTime, childF0Median });
    setAnalysis(result);
    const proxy = detectPossibleProxy(result);
    setProxyWarn(proxy.reason);

    // 目标词 ASR：仅对「完美参与」调用，降低调用量（Phase 3）
    if (targetWord && result.engagement === "high") {
      try {
        const asrRes = await recognizeTargetWord(blob, targetWord, {
          childVoiceRatio: result.childVoiceRatio,
          effectiveDuration: result.effectiveDuration,
          engagementStars: result.engagementStars,
        });
        setAsr(asrRes);
      } catch {
        /* 忽略 */
      }
    }

    // 本地持久化（不上传）
    try {
      await saveRecording({
        id: `rec_${Date.now()}`,
        createdAt: Date.now(),
        blob,
        duration: result.duration,
        analysis: result,
        taskId,
      });
    } catch {
      /* 本地存储失败不影响分析展示 */
    }
    setPhase("result");
    onComplete?.(result, blob);
  }, [blob, adultEndTime, taskId, targetWord, onComplete]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const meta = analysis ? ENGAGEMENT_META[analysis.engagement] : null;

  return (
    <div className="space-y-3">
      <RecordingConsentModal
        open={showConsent}
        onAgree={() => {
          setVoiceConsent();
          setShowConsent(false);
          void startRecording();
        }}
        onDecline={() => setShowConsent(false)}
      />

      {/* 录音控制 */}
      <div className="flex items-center gap-3">
        <button
          onClick={phase === "recording" ? stopRecording : startRecording}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-sm active:scale-95 transition-all ${
            phase === "recording"
              ? "bg-red-500 text-white"
              : "bg-indigo-50 text-indigo-500"
          }`}
          style={{ minHeight: 44, minWidth: 44 }}
          title={phase === "recording" ? "停止" : "开始录音"}
        >
          {phase === "recording" ? (
            <motion.span className="w-3 h-3 rounded-sm bg-white" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
          ) : (
            "🎙️"
          )}
        </button>
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-700">
            {phase === "recording" ? `录音中 ${fmt(duration)}` : phase === "idle" ? "点击开始录音" : "录音完成"}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">原始音频仅留在本机，不会上传</p>
        </div>
      </div>

      {/* 回放确认 */}
      <AnimatePresence>
        {phase === "recorded" && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
            <button onClick={togglePlayback} className="flex-1 py-2 rounded-xl bg-indigo-100 text-indigo-600 text-xs font-bold active:scale-95">
              ▶️ 回放确认
            </button>
            <button onClick={reset} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-medium active:scale-95">
              重录
            </button>
            <button onClick={submit} className="px-3 py-2 rounded-xl bg-green-500 text-white text-xs font-bold active:scale-95">
              提交分析
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 分析中 */}
      {phase === "analyzing" && (
        <div className="py-2 text-center text-xs text-gray-400">🔍 本地分析中…</div>
      )}

      {/* 错误 */}
      {phase === "error" && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-red-500">{errorMsg}</p>
          <button onClick={reset} className="text-xs text-indigo-500 underline">重试</button>
        </div>
      )}

      {/* 跳过 */}
      {onSkip && (phase === "idle" || phase === "recorded") && (
        <button onClick={onSkip} className="text-[11px] text-gray-400 underline">
          跳过本题
        </button>
      )}

      {/* 结果报告 */}
      <AnimatePresence>
        {phase === "result" && analysis && meta && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl p-4 ${meta.bg}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{meta.emoji}</span>
              <div>
                <p className={`text-sm font-extrabold ${meta.color}`}>{meta.label}</p>
                <p className="text-[10px] text-gray-500">参与度评分（三星制）</p>
              </div>
            </div>
            {/* 统一 1-5 星级（方案要求代替 A/B/C/D） */}
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={i <= analysis.starRating ? "text-amber-400" : "text-gray-300"}>
                  {i <= analysis.starRating ? "⭐" : "☆"}
                </span>
              ))}
              <span className="text-[11px] text-gray-500 ml-1">统一评分 {analysis.starRating}/5 · {analysis.voiceScore}分</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-bold text-gray-700">{analysis.effectiveDuration.toFixed(1)}s</p>
                <p className="text-[10px] text-gray-400">有效发声</p>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">{Math.round(analysis.confidence * 100)}%</p>
                <p className="text-[10px] text-gray-400">声线置信度</p>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-700">
                  {analysis.f0ChildMean > 0 ? `${Math.round(analysis.f0ChildMean)}Hz` : "—"}
                </p>
                <p className="text-[10px] text-gray-400">儿童基频</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-gray-600 leading-relaxed">
              💡 {analysis.suggestion}
            </p>
            {adaptive && (
              <p className="mt-2 text-[11px] text-indigo-500 leading-relaxed">
                🎯 已启用该儿童自适应声线阈值（基于历史录音校准）
              </p>
            )}
            {asr && (
              <p className="mt-2 text-[11px] text-emerald-600 leading-relaxed">
                🔤 目标词「{asr.word}」：{asr.matched ? "✅ 已说出" : "未识别"}（{asr.mode === "cloud" ? "云端ASR" : "本地启发式"} · 置信度 {Math.round(asr.confidence * 100)}%）
              </p>
            )}
            {proxyWarn && (
              <p className="mt-2 text-[11px] text-amber-600 leading-relaxed">⚠️ {proxyWarn}</p>
            )}
            <button onClick={reset} className="mt-3 w-full py-2 rounded-xl bg-white/70 text-gray-500 text-xs font-medium active:scale-95">
              再录一次
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="mt-2 w-full py-2.5 rounded-xl bg-indigo-500 text-white text-xs font-bold active:scale-95"
              >
                完成 ✓（本次评分已记录）
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
