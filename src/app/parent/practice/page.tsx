"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import GuideCoach from "@/components/training/GuideCoach";
import { getGuideScript } from "@/lib/guide-script";
import { getActivityById } from "@/data/training-activities";

// 练习页（阶段四 · D 接入点）：旅程站点点开后进入「陪练模式」，
// 由 GuideCoach 按引导脚本带着家长把这一步练完，完成后标记任务完成。

export default function PracticePage() {
  const router = useRouter();
  const [params, setParams] = useState<URLSearchParams | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    setParams(new URLSearchParams(window.location.search));
  }, []);

  const taskId = params?.get("taskId") || "";
  const activity = params?.get("activity") || params?.get("activityType") || "";
  const word = params?.get("word") || "";
  const scene = params?.get("scene") || "";
  const title = params?.get("title") || (word ? `训练「${word}」` : "今日训练");

  const activityName = useMemo(
    () => getActivityById(activity)?.name || "",
    [activity]
  );

  const script = useMemo(
    () =>
      getGuideScript({
        activityId: activity,
        activityName,
        targetWord: word,
        scene,
      }),
    [activity, activityName, word, scene]
  );

  const markComplete = async () => {
    if (!taskId) {
      router.push("/parent/journey");
      return;
    }
    setCompleting(true);
    try {
      await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
    } catch {
      /* 失败也继续跳转，不卡住家长 */
    } finally {
      router.push("/parent/journey");
    }
  };

  if (!params) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#FBF7F0" }}>
        <span className="text-2xl animate-pulse">⏳</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#FBF7F0" }}>
      <div className="max-w-md mx-auto px-4 pt-5 pb-10">
        {/* 头部 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/parent/journey")}
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{ background: "#EFE7DA", color: "#8A7A68" }}
          >
            ← 返回旅程
          </button>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: "#3E3A33" }}>
              🧭 {title}
            </p>
            <p className="text-[11px]" style={{ color: "#8A7A68" }}>
              {scene ? `${scene} · ` : ""}陪练模式
            </p>
          </div>
        </div>

        {/* 开场说明 */}
        <div
          className="mt-4 rounded-2xl px-4 py-3 text-sm"
          style={{ background: "#FFFFFF", border: "1px solid #EADFD0", color: "#3E3A33" }}
        >
          {script.intro}
        </div>

        {/* 引导器 */}
        <div className="mt-4">
          <GuideCoach
            script={script}
            allowSkip={!!taskId}
            onComplete={markComplete}
            onSkip={markComplete}
          />
        </div>

        {completing && (
          <p className="text-center text-xs mt-4" style={{ color: "#8A7A68" }}>
            正在保存进度…
          </p>
        )}
      </div>
    </div>
  );
}
