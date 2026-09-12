"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BottomNav from "@/components/bottom-nav";
import { bottomTabs } from "@/data/mock-data";
import type { TabId } from "@/types";
import VoiceRecorder from "@/components/voice-recorder/VoiceRecorder";
import PracticeVoiceLab from "@/components/voice-recorder/PracticeVoiceLab";
import { DEFAULT_PRACTICE_WORDS } from "@/data/learning";
import { ensureRetentionCleanup } from "@/lib/recording-store";

export default function VoiceLabPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-400 text-sm">加载中…</div>}>
      <VoiceLabInner />
    </Suspense>
  );
}

function VoiceLabInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 进入即清理 30 天前的本地录音
    void ensureRetentionCleanup();
  }, []);

  const handleTabChange = (tab: TabId) => {
    if (tab === "profile") router.push("/parent/settings");
    else if (tab === "hearing") router.push("/parent/hearing-test");
    else if (tab === "learning") router.push("/parent/daily-learning");
    else if (tab === "community") router.push("/parent/community");
    else router.push("/parent");
  };

  // 语音练习模式：mode=daily（来自每日学习「去练习」或首页「语音练习」卡片）
  const isPractice = searchParams.get("mode") === "daily";
  const source = searchParams.get("source") || "task_page";
  const contentId = searchParams.get("contentId");
  const title = searchParams.get("title");
  const rawWords = searchParams.get("words");
  const words = rawWords
    ? rawWords.split(",").map((w) => w.trim()).filter(Boolean)
    : DEFAULT_PRACTICE_WORDS;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 md:px-6 pt-5">
        <div className="md:max-w-2xl md:mx-auto">
          <button onClick={() => router.back()} className="text-xs text-gray-400 mb-2">‹ 返回</button>
          {isPractice ? (
            <>
              <h1 className="text-xl font-extrabold text-gray-800">🎙️ 语音练习</h1>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                跟读练习，体验「本地录音 → 儿童声线识别 → 参与度星级」。所有分析在您的设备本地完成，原始录音不会上传。
              </p>
              <div className="mt-5">
                <PracticeVoiceLab
                  source={source}
                  contentId={contentId}
                  title={title}
                  words={words}
                />
              </div>
              <div className="mt-4 rounded-2xl bg-indigo-50 p-4 text-[11px] text-indigo-700 leading-relaxed">
                🔒 <strong>隐私说明</strong>：录音仅保存在本机（IndexedDB），30 天自动清理；
                仅向云端同步脱敏的结构化评分（参与度 / 基频等），<strong>永远不上传原始音频</strong>。
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl font-extrabold text-gray-800">🎙️ 声线体验 · 录音练习</h1>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                这是一个独立演示入口，用于体验「本地录音 → 儿童声线识别 → 参与度评分」的最小闭环。
                所有分析都在您的设备本地完成，原始录音不会上传。
              </p>

              <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <p className="text-sm font-bold text-gray-700 mb-2">录一段宝宝的声音试试</p>
                <VoiceRecorder />
              </div>

              <div className="mt-4 rounded-2xl bg-indigo-50 p-4 text-[11px] text-indigo-700 leading-relaxed">
                🔒 <strong>隐私说明</strong>：录音仅保存在本机（IndexedDB），30 天自动清理，可随时删除；
                治疗师端只接收脱敏后的结构化指标（参与度 / 基频等），<strong>永远听不到原始录音</strong>。
              </div>

              <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
                <p className="text-sm font-bold text-gray-700 mb-1">三级参与度含义</p>
                <ul className="text-[11px] text-gray-600 space-y-1.5 leading-relaxed">
                  <li>⭐ <strong>待提高</strong>：录音中未检测到儿童声线（孩子未发声 / 较害羞）。</li>
                  <li>⭐⭐ <strong>有效参与</strong>：检测到儿童声线，孩子有尝试参与。</li>
                  <li>⭐⭐⭐ <strong>完美参与</strong>：儿童声线紧随成人声线出现（模仿 / 跟读行为）。</li>
                </ul>
              </div>

              <button
                onClick={() => router.push("/parent/voice-report")}
                className="mt-4 w-full py-3 rounded-2xl bg-white text-indigo-600 text-sm font-semibold border border-indigo-100 hover:bg-indigo-50 active:scale-[0.98] transition-all"
              >
                📊 查看参与度趋势报告
              </button>
            </>
          )}
        </div>
      </div>

      <BottomNav activeTab="hearing" onTabChange={handleTabChange} tabs={bottomTabs} />
    </div>
  );
}
