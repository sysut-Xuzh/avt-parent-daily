"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import GreetingHeader from "@/components/greeting-header";
import BabySwitcher from "@/components/baby-switcher";
import { useBaby } from "@/components/baby-provider";
import JourneyMap, { type JourneyStation } from "@/components/journey/JourneyMap";
import { LEARNING_ITEMS } from "@/data/learning";
import type { DailyTask } from "@/types";

export default function JourneyPage() {
  const router = useRouter();
  const { currentBabyId } = useBaby();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);

  const dateLabel = new Date().toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  // 今日学习站：按日期在「精选」学习项里挑一个
  const dayIndex = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  const featured = LEARNING_ITEMS.filter((i) => i.featured);
  const learnItem = (featured.length ? featured : LEARNING_ITEMS)[
    dayIndex % (featured.length || LEARNING_ITEMS.length)
  ];

  const handleComplete = useCallback((taskId: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: true } : t)));
    fetch("/api/tasks/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const qs = currentBabyId ? `?baby_id=${encodeURIComponent(currentBabyId)}` : "";
        const res = await fetch(`/api/tasks/today${qs}`);
        const data = await res.json();
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
      } catch {
        setTasks([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentBabyId]);

  const taskStations: JourneyStation[] = tasks.map((t) => ({
    id: t.id,
    kind: "task",
    title: t.targetWord ? `训练「${t.targetWord}」` : t.strategy,
    subtitle: `${t.time} · ${t.scene} · ${t.strategy}`,
    icon: t.sceneIcon || "📋",
    done: t.completed,
    href: `/parent/practice?taskId=${encodeURIComponent(t.id)}&activity=${encodeURIComponent(
      t.activityType || ""
    )}&word=${encodeURIComponent(t.targetWord || "")}&scene=${encodeURIComponent(
      t.scene || ""
    )}&title=${encodeURIComponent(t.targetWord ? `训练「${t.targetWord}」` : t.strategy)}`,
    actionLabel: "开始陪练",
    secondaryOnAction: t.completed ? undefined : () => handleComplete(t.id),
    secondaryLabel: "标记完成",
  }));

  const learnStation: JourneyStation = {
    id: "learn-of-day",
    kind: "learn",
    title: learnItem?.title || "今日学习",
    subtitle: learnItem?.durationLabel || "3分钟 · 家长学堂",
    icon: learnItem?.emoji || "📚",
    done: false,
    href: "/parent/daily-learning",
    actionLabel: "去学习",
  };

  const voiceStation: JourneyStation = {
    id: "voice-of-day",
    kind: "voice",
    title: "每日声线练习",
    subtitle: "跟读几个词，记录参与度",
    icon: "🎙️",
    done: false,
    href: "/parent/voice-lab",
    actionLabel: "去练习",
  };

  const stations: JourneyStation[] = [...taskStations, learnStation, voiceStation];
  const doneCount = stations.filter((s) => s.done).length;
  const totalCount = stations.length;

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#FBF7F0]">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-4xl mb-3">⏳</div>
            <p className="text-sm" style={{ color: "#8A7A68" }}>
              正在铺开今天的地图...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FBF7F0]">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 pt-4">
        <GreetingHeader />
        <div className="mt-3">
          <BabySwitcher />
        </div>

        <div className="mt-4">
          <JourneyMap
            dateLabel={dateLabel}
            doneCount={doneCount}
            totalCount={totalCount}
            streakDays={0}
            stations={stations}
          />
        </div>

        {totalCount === 0 && (
          <p className="text-center text-sm mt-6" style={{ color: "#8A7A68" }}>
            今天还没有布置训练任务～ 治疗师布置后，这里会出现一段旅程 🗺️
          </p>
        )}

        <button
          onClick={() => router.push("/parent")}
          className="mx-auto mt-6 block text-xs"
          style={{ color: "#8A7A68" }}
        >
          ← 返回任务列表
        </button>
      </div>
    </div>
  );
}
