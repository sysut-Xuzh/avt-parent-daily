"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import GreetingHeader from "@/components/greeting-header";
import StreakCard from "@/components/streak-card";
import TaskCard from "@/components/task-card";
import BottomNav from "@/components/bottom-nav";
import CelebrationToast from "@/components/celebration-toast";
import AllDoneCard from "@/components/all-done-card";
import DailySummary from "@/components/daily-summary";
import WeeklyStory from "@/components/weekly-story";
import EmptyState from "@/components/empty-state";
import GrowthCalendar from "@/components/growth-calendar";
import VoicePrintSetup from "@/components/voice-recorder/VoicePrintSetup";
import { bottomTabs } from "@/data/mock-data";
import { DEFAULT_PRACTICE_WORDS, LEARNING_ITEMS } from "@/data/learning";
import { addToOfflineQueue, syncOfflineQueue } from "@/lib/offline-sync";
import { getVoicePrintStatus, type VoiceProfileStatus } from "@/lib/recording-store";
import { getRecommendationsForParent, type RecommendationRow } from "@/lib/recommendations-service";
import CoachTour, { FIRST_LOGIN_TOUR } from "@/components/feature-guide/CoachTour";
import BabySwitcher from "@/components/baby-switcher";
import { ONBOARDING_FLAG } from "@/lib/guide-content";
import type { DailyTask, UserProgress, TabId } from "@/types";

export default function ParentPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [progress, setProgress] = useState<UserProgress>({
    streakDays: 0, todayCompleted: 0, todayTotal: 0,
    weeklyCompleted: 0, weeklyTotal: 0,
  });
  const [activeTab, setActiveTab] = useState<TabId>("tasks");
  const [showToast, setShowToast] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceProfileStatus>("none");
  const [recommendations, setRecommendations] = useState<RecommendationRow[]>([]);
  // 首次登录引导浮层：未引导过则自动弹出（引导优先于声纹弹窗）
  const [showOnboarding, setShowOnboarding] = useState(false);
  const finishOnboarding = useCallback(() => {
    try {
      window.localStorage.setItem(ONBOARDING_FLAG, "1");
    } catch {
      /* 忽略 */
    }
    setShowOnboarding(false);
    // 引导结束后无缝接上声纹建档（否则需刷新页面才会弹）
    if (getVoicePrintStatus() === "none") {
      setTimeout(() => setShowVoiceModal(true), 350);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [tasksRes, progressRes] = await Promise.all([
          fetch("/api/tasks/today"),
          fetch("/api/progress/today"),
        ]);
        if (!tasksRes.ok) throw new Error("获取任务失败");
        if (!progressRes.ok) throw new Error("获取进度失败");
        const tasksData = await tasksRes.json();
        const progressData = await progressRes.json();
        if (tasksData.tasks && tasksData.tasks.length > 0) {
          setTasks(tasksData.tasks);
          setProgress({
            streakDays: progressData.streakDays || 0,
            todayCompleted: progressData.completed || 0,
            todayTotal: progressData.total || 0,
            weeklyCompleted: progressData.weekCompleted || 0,
            weeklyTotal: progressData.weekTotal || 0,
          });
        } else {
          // 数据库今天没有任务 → 显示空状态，不回退到假数据
          setTasks([]);
          setProgress({ streakDays: 0, todayCompleted: 0, todayTotal: 0, weeklyCompleted: 0, weeklyTotal: 0 });
        }
      } catch (err) {
        console.error("加载数据失败:", err);
        setTasks([]);
        setProgress({ streakDays: 0, todayCompleted: 0, todayTotal: 0, weeklyCompleted: 0, weeklyTotal: 0 });
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    // 联网时自动同步离线队列
    const handleOnline = () => { syncOfflineQueue(); };
    window.addEventListener("online", handleOnline);
    // 页面加载时也尝试同步
    syncOfflineQueue();
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  // 首次登录引导（方案：功能导览）：未引导过 → 先走引导浮层
  useEffect(() => {
    try {
      if (window.localStorage.getItem(ONBOARDING_FLAG) !== "1") setShowOnboarding(true);
    } catch {
      /* 忽略 */
    }
  }, []);

  // 声纹建档引导（方案 §3）：已引导过且未建档 → 弹引导；已跳过 → 顶部常驻提示
  useEffect(() => {
    const st = getVoicePrintStatus();
    setVoiceStatus(st);
    let onboarded = false;
    try {
      onboarded = window.localStorage.getItem(ONBOARDING_FLAG) === "1";
    } catch {
      /* 忽略 */
    }
    if (st === "none" && onboarded) setShowVoiceModal(true);
  }, []);

  const handleVoiceDone = useCallback(() => {
    setShowVoiceModal(false);
    setVoiceStatus(getVoicePrintStatus());
  }, []);

  // 治疗师推荐同步（方案 § P3）
  useEffect(() => {
    getRecommendationsForParent()
      .then((rows) => setRecommendations(rows))
      .catch(() => setRecommendations([]));
  }, []);

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  const handleComplete = useCallback((taskId: string) => {
    // 先更新本地状态（UX 即时反馈）
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, completed: true } : t));
    setShowToast(true);
    setProgress((prev) => ({ ...prev, todayCompleted: prev.todayCompleted + 1 }));
    // 同步到数据库
    fetch("/api/tasks/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    }).then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.warn("[Parent] 任务完成同步失败:", data.error || data.warning);
        // 如果是 taskId 不匹配（mock data），不回滚（开发阶段）
        if (!data.warning) {
          // 真实错误，存入离线队列等下次同步
          addToOfflineQueue({ type: "complete", taskId, data: {}, timestamp: Date.now() });
        }
      }
    }).catch(() => {
      // 断网时存入离线队列
      addToOfflineQueue({ type: "complete", taskId, data: {}, timestamp: Date.now() });
    });
  }, []);

  const handleCloseToast = useCallback(() => setShowToast(false), []);

  // Tab 点击跳转
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    if (tab === "profile") router.push("/parent/settings");
    else if (tab === "hearing") router.push("/parent/hearing-test");
    else if (tab === "learning") router.push("/parent/daily-learning");
    else if (tab === "community") router.push("/parent/community");
    else router.push("/parent");
  };
  const completedTasks = tasks.filter((t) => t.completed);
  const pendingTasks = tasks.filter((t) => !t.completed);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-3">⏳</div>
            <p className="text-gray-400 text-sm">加载今日训练任务...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 md:bg-transparent">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
        <div className="md:px-6 md:pt-2"><GreetingHeader /></div>
        <BabySwitcher />
        <div className="mt-3 md:px-6"><StreakCard progress={progress} /></div>

        {/* 语音练习卡片（方案 §5 双入口之一：今日任务页） */}
        <div className="mt-3 mx-4 md:mx-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-extrabold text-amber-800">🎙️ 每日语音练习</p>
              <p className="text-[11px] text-amber-600/80 mt-0.5">跟读几个词，看看宝贝今天的参与度</p>
            </div>
            <button
              onClick={() =>
                router.push(
                  `/parent/voice-lab?mode=daily&source=task_page&words=${encodeURIComponent(DEFAULT_PRACTICE_WORDS.join(","))}`
                )
              }
              className="text-xs font-semibold text-white bg-amber-500 px-3.5 py-2 rounded-full active:scale-95 whitespace-nowrap"
            >
              去练习 ›
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {DEFAULT_PRACTICE_WORDS.map((w) => (
              <span key={w} className="px-2.5 py-1 rounded-full bg-white/70 text-amber-700 text-xs font-medium">
                {w}
              </span>
            ))}
          </div>
        </div>

        {/* 治疗师推荐同步（方案 § P3）：家长端可见治疗师推送的学习内容 */}
        {recommendations.length > 0 && (
          <div className="mt-3 mx-4 md:mx-6">
            <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
              <span>📩</span> 治疗师推荐
              <span className="text-[10px] font-normal text-gray-400">来自治疗师的学习建议</span>
            </p>
            <div className="space-y-2">
              {recommendations.map((rec) => {
                const item = LEARNING_ITEMS.find((i) => i.id === rec.content_id);
                const words =
                  item?.voice_keywords && item.voice_keywords.length
                    ? item.voice_keywords
                    : item?.relatedKeywords && item.relatedKeywords.length
                    ? item.relatedKeywords
                    : DEFAULT_PRACTICE_WORDS;
                const title = item?.title || rec.content_title;
                return (
                  <div key={rec.id} className="rounded-2xl bg-white p-3 shadow-sm border border-indigo-100">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">📚</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{title}</p>
                        {rec.note && (
                          <p className="text-[11px] text-indigo-600 mt-0.5 leading-snug">💬 {rec.note}</p>
                        )}
                        <p className="text-[10px] text-gray-400 mt-0.5">推荐人：{rec.therapist_name}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => router.push(`/parent/daily-learning?item=${encodeURIComponent(rec.content_id)}`)}
                        className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-medium active:scale-95"
                      >
                        查看内容
                      </button>
                      <button
                        onClick={() =>
                          router.push(
                            `/parent/voice-lab?mode=daily&source=task_page&contentId=${encodeURIComponent(rec.content_id)}&title=${encodeURIComponent(title)}&words=${encodeURIComponent(words.join(","))}`
                          )
                        }
                        className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-xs font-bold active:scale-95"
                      >
                        🎙️ 去练习
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 声纹建档提示栏：已跳过 → 常驻引导；已建档/自动推断 → 不显示 */}
        {voiceStatus === "skipped" && (
          <div className="mt-3 mx-4 md:mx-6 flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
            <span className="text-base">🎙️</span>
            <p className="flex-1 text-[12px] text-indigo-700 leading-snug">
              还没录入宝宝声线，识别会更准哦～
            </p>
            <button
              onClick={() => setShowVoiceModal(true)}
              className="text-[12px] font-semibold text-indigo-600 bg-white px-3 py-1 rounded-full active:scale-95"
            >
              去录入
            </button>
          </div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center justify-between px-4 md:px-8 mt-5 mb-2">
          <h2 className="text-base md:text-lg font-bold text-gray-800">今日训练清单</h2>
          <span className="text-xs md:text-sm text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {completedCount}/{totalCount} 完成
          </span>
        </motion.div>

        <div className="mt-1">
          {tasks.length === 0 ? (
            <EmptyState icon="📋" title="今天还没有训练任务" description="等待治疗师制定本周计划" />
          ) : (
            <div className="space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 md:px-6">
              {completedTasks.map((task, i) => (
                <TaskCard key={task.id} task={task} onComplete={handleComplete} index={i} />
              ))}
              {pendingTasks.map((task, i) => (
                <TaskCard key={task.id} task={task} onComplete={handleComplete} index={i + completedTasks.length} />
              ))}
            </div>
          )}
          {allDone && <div className="mt-4 md:mt-6 md:px-6"><AllDoneCard /></div>}

          {/* 查看下一提示 */}
          {pendingTasks.length > 0 && (
            <div className="px-4 md:px-6 mt-3">
              <button
                onClick={() => {
                  const firstPending = pendingTasks[0];
                  const el = document.getElementById("task-" + firstPending.id);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-medium hover:bg-indigo-100 transition-all active:scale-[0.98]"
              >
                📋 查看下一提示（还有 {pendingTasks.length} 个待完成）
              </button>
            </div>
          )}
          <DailySummary completed={completedCount} total={totalCount} tasks={tasks} />
          <WeeklyStory completed={completedCount} total={totalCount} tasks={tasks} />
          <GrowthCalendar />
        </div>
      </div>
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} tabs={bottomTabs} />
      <CelebrationToast show={showToast} onClose={handleCloseToast} />
      <VoicePrintSetup open={showVoiceModal} onDone={handleVoiceDone} />
      <CoachTour open={showOnboarding} steps={FIRST_LOGIN_TOUR} onDone={finishOnboarding} />
    </div>
  );
}
