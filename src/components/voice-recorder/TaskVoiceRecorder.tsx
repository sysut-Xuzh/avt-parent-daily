"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VoiceRecorder from "./VoiceRecorder";
import { saveTaskRating } from "@/lib/voice-ratings-service";
import { maybeInferVoiceBaseline, addAutoBaselineSample } from "@/lib/recording-store";
import type { VoiceAnalysis } from "@/lib/voice-analysis";

/**
 * 任务录音按钮改造（方案 §4 / P1）
 * - 替换旧的上传式 AudioRecorder
 * - 点击弹出底部录音面板 → 本地声线分析 → 展示 ⭐1-5 星级
 * - 完成后静默保存脱敏结构化指标到 task_voice_ratings（云端失败不报错）
 * - 已录制的星级以本地标记持久化显示，便于家长回看
 */
const STAR_KEY = (taskId: string) => `avt_task_star_${taskId}`;

export default function TaskVoiceRecorder({
  taskId,
  targetWord,
}: {
  taskId: string;
  targetWord?: string;
}) {
  const [open, setOpen] = useState(false);
  const [star, setStar] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(STAR_KEY(taskId));
      if (v) setStar(Number(v));
    } catch {
      /* ignore */
    }
  }, [taskId]);

  const handleComplete = async (analysis: VoiceAnalysis) => {
    setSaving(true);
    try {
      await saveTaskRating({ taskId, analysis });
      window.localStorage.setItem(STAR_KEY(taskId), String(analysis.starRating));
      setStar(analysis.starRating);
      // P5：累积含宝宝声线的任务样本，达到阈值后静默推断声纹基准
      const samples = addAutoBaselineSample({
        taskId,
        childVoiceBaselineHz: analysis.f0ChildMean > 0 ? Math.round(analysis.f0ChildMean) : null,
        hasChildVoice: analysis.hasChildVoice,
      });
      maybeInferVoiceBaseline(samples);
    } catch {
      /* 忽略 */
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-11 h-11 rounded-xl bg-amber-500 hover:bg-amber-600 flex items-center justify-center shadow-sm transition-colors active:scale-95"
        title="录音评估参与度"
        aria-label="录音评估"
      >
        {star ? (
          <span className="text-base leading-none">⭐{star}</span>
        ) : (
          <span className="text-lg">🎙️</span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={() => setOpen(false)}>
            <motion.div
              className="w-full max-w-md bg-white rounded-t-3xl p-5 pb-7 max-h-[90vh] overflow-y-auto"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1.5 rounded-full bg-gray-200 mx-auto mb-3" />
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-extrabold text-gray-800">🎙️ 任务录音评估</h3>
                <button onClick={() => setOpen(false)} className="text-gray-400 text-lg leading-none">✕</button>
              </div>
              {targetWord && (
                <div className="mb-3 flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-50 w-fit">
                  <span className="text-xs text-amber-700 font-semibold">🎯 目标词：{targetWord}</span>
                </div>
              )}
              <p className="text-[11px] text-gray-400 mb-3">
                原始音频仅留在本机，不会上传；仅保存脱敏的参与度评分。
                {saving && <span className="text-indigo-500"> · 保存中…</span>}
              </p>
              <VoiceRecorder taskId={taskId} targetWord={targetWord} onComplete={handleComplete} onClose={() => setOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
