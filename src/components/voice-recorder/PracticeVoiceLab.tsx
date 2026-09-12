"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import VoiceRecorder from "./VoiceRecorder";
import { savePracticeRating, type PracticeWordResult } from "@/lib/voice-ratings-service";
import type { VoiceAnalysis } from "@/lib/voice-analysis";

/**
 * 语音练习（方案 §5 / P2 · mode=daily）
 * - 由每日学习「去练习」或首页「语音练习」卡片进入
 * - 展示练习目标词 → 单次录音 → 本地分析 → 展示 ⭐1-5 星级
 * - 完成后保存脱敏结构化指标到 practice_voice_ratings（含逐词结果）
 */
export default function PracticeVoiceLab({
  source,
  contentId,
  title,
  words,
}: {
  source: string;
  contentId?: string | null;
  title?: string | null;
  words: string[];
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedStar, setSavedStar] = useState<number | null>(null);

  const handleComplete = async (analysis: VoiceAnalysis) => {
    setSaving(true);
    const wordResults: PracticeWordResult[] = words.map((w) => ({
      word: w,
      star_rating: analysis.starRating,
      score: analysis.voiceScore,
    }));
    try {
      await savePracticeRating({
        contentId: contentId ?? null,
        source,
        words,
        wordResults,
        overallStarRating: analysis.starRating,
        overallScore: analysis.voiceScore,
      });
      setSaved(true);
      setSavedStar(analysis.starRating);
    } catch {
      /* 忽略 */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-bold text-gray-700 mb-1">🗣️ 语音练习{title ? ` · ${title}` : ""}</p>
        <p className="text-[11px] text-gray-400 mb-3">让宝宝跟读下面词语，录音后会给出参与度星级（不保存原始音频）。</p>
        <div className="flex flex-wrap gap-1.5">
          {words.map((w) => (
            <span key={w} className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-medium">
              {w}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-bold text-gray-700 mb-2">录一段跟读</p>
        <VoiceRecorder onComplete={handleComplete} />
        {saving && <p className="text-[11px] text-indigo-500 mt-2">保存练习记录中…</p>}
        {saved && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2"
          >
            <span className="text-base">✅</span>
            <p className="text-[12px] text-emerald-700 font-medium">
              已保存到练习记录（{savedStar ? `⭐${savedStar}/5` : ""}）
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
