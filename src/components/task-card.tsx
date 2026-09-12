"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import TaskVoiceRecorder from "@/components/voice-recorder/TaskVoiceRecorder";
import AnimationModal from "@/components/animation-modal";
import { DailyTask } from "@/types";
import { useRouter } from "next/navigation";
import { getRelatedLearningForTask } from "@/data/learning";
import { getSpeechByStrategy } from "@/data/task-speech";
import { getActivityDisplay, STRATEGY_TO_ACTIVITY } from "@/data/training-activities";
import { buildTimeline } from "@/data/activity-audio-timeline";

interface TaskCardProps {
  task: DailyTask;
  onComplete: (id: string) => void;
  index: number;
}

const sceneAnimation: Record<string, { animate: any; transition: any }> = {
  "🍳": { animate: { y: [0, -3, 0], rotate: [0, -5, 5, 0] }, transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
  "🎮": { animate: { x: [0, 3, -3, 0], rotate: [0, 5, -5, 0] }, transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } },
  "🛁": { animate: { y: [0, -4, 0], scale: [1, 1.05, 1] }, transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" } },
  "🌙": { animate: { opacity: [0.7, 1, 0.7], scale: [0.95, 1.05, 0.95] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
};

const characterAnimation: Record<string, { animate: any; transition: any }> = {
  "🐰": { animate: { rotate: [0, -8, 8, 0], y: [0, -2, 0] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  "🐶": { animate: { rotate: [0, 5, -5, 0], scale: [1, 1.08, 1] }, transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } },
  "🦉": { animate: { rotate: [0, -3, 3, 0] }, transition: { duration: 4, repeat: Infinity, ease: "easeInOut" } },
  "🐱": { animate: { y: [0, -2, 0], scale: [1, 1.03, 1] }, transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" } },
  "🐻": { animate: { rotate: [0, -6, 6, 0], y: [0, -2, 0] }, transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" } },
  "🦊": { animate: { y: [0, -3, 0], rotate: [0, 4, -4, 0] }, transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" } },
};

const STAGGER = 200;

export default function TaskCard({ task, onComplete, index }: TaskCardProps) {
  const router = useRouter();
  const relatedLearning = getRelatedLearningForTask(task);
  const isCompleted = task.completed;
  const [celebrating, setCelebrating] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  // 动态读取活动配置：优先 activityType（活动ID），兼容旧的中文策略名
  const config = useMemo(() => {
    const activityId = task.activityType || STRATEGY_TO_ACTIVITY[task.strategy] || "";
    const display = getActivityDisplay(activityId);
    return {
      ...display,
      activityId,
      label: task.activityName || task.strategy || "训练活动",
    };
  }, [task.activityType, task.activityName, task.strategy]);

  // 构建分镜时间表（音画同步核心）
  const timeline = useMemo(() => {
    if (!config.activityId) return undefined;
    const speech = task.speechText || getSpeechByStrategy(task.strategy, task.targetWord);
    return buildTimeline(config.activityId, speech, task.scene, config.animationSteps);
  }, [config.activityId, config.animationSteps, task.speechText, task.strategy, task.targetWord, task.scene]);

  const handleCompleteClick = () => {
    if (isCompleted) return;
    setCelebrating(true);
    setTimeout(() => { setCelebrating(false); onComplete(task.id); }, 1200);
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * STAGGER / 1000 } }),
  };

  return (
    <>
      <motion.div
        id={"task-" + task.id}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        whileHover={!isCompleted ? { scale: 1.01 } : undefined}
        className={`relative mx-4 md:mx-0 rounded-xl shadow-sm border overflow-hidden ${
          isCompleted ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100"
        }`}
      >
        {!isCompleted && (
          <motion.div
            initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`h-1.5 rounded-t-xl origin-left ${config.color.replace("bg-", "bg-").replace("-50", "-400")}`}
          />
        )}

        <div className="p-4 space-y-2">
          {/* 行1：图标 + 头部信息 */}
          <motion.div custom={1} variants={item} initial="hidden" animate="show" className="flex items-center gap-2">
            <motion.div
              animate={isCompleted ? undefined : sceneAnimation[task.sceneIcon]?.animate}
              transition={isCompleted ? undefined : sceneAnimation[task.sceneIcon]?.transition}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${isCompleted ? "bg-gray-200" : getSceneColor(task.sceneIcon)}`}
            >
              {task.sceneIcon}
            </motion.div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{task.time}</span>
                {!isCompleted && (
                  <motion.span
                    animate={characterAnimation[config.character]?.animate}
                    transition={characterAnimation[config.character]?.transition}
                    className="text-sm" title={config.characterName}
                  >
                    {config.character}
                  </motion.span>
                )}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isCompleted ? "bg-gray-200 text-gray-500" : config.badgeColor}`}>
                {task.scene}·{config.label}
              </span>
            </div>
          </motion.div>

          {/* 行2：目标词 */}
          <motion.div custom={2} variants={item} initial="hidden" animate="show">
            <span className={`inline-flex items-center gap-1 text-sm font-bold px-2.5 py-1 rounded-md ${
              isCompleted ? "bg-amber-100 text-amber-400 line-through" : "bg-amber-50 text-amber-700"
            }`}>
              🎯 {task.targetWord}
            </span>
            {!isCompleted && relatedLearning.length > 0 && (
              <button
                onClick={() => router.push("/parent/daily-learning")}
                className="ml-2 inline-flex items-center gap-1 text-xs font-semibibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 align-middle active:scale-95"
              >
                💡 去学习
              </button>
            )}
          </motion.div>

          {/* 行3：引导语 */}
          <motion.div custom={3} variants={item} initial="hidden" animate="show"
            className={`relative pl-3 border-l-2 ${isCompleted ? "border-gray-300" : config.borderColor}`}
          >
            <p className={`text-sm font-semibold leading-relaxed ${isCompleted ? "text-gray-400 line-through" : "text-gray-800"}`}>
              {task.instruction}
            </p>
          </motion.div>

          {/* 行4：小贴士 */}
          {!isCompleted && (
            <motion.div custom={4} variants={item} initial="hidden" animate="show"
              className={`flex items-start gap-1.5 px-2 py-1.5 rounded-lg ${config.color}`}
            >
              <span className="text-xs mt-0.5">💡</span>
              <span className={`text-xs ${config.color.replace("bg-", "text-").replace("-50", "-600")}`}>{config.tip}</span>
            </motion.div>
          )}

          {/* 行5：按钮区 — 新增绿色播放按钮 */}
          <motion.div custom={5} variants={item} initial="hidden" animate="show" className="flex items-center gap-2 pt-1">
            <motion.button
              onClick={handleCompleteClick} disabled={isCompleted}
              whileTap={!isCompleted ? { scale: 0.92 } : undefined}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                isCompleted
                  ? "bg-green-100 text-green-600 border border-green-200"
                  : "bg-indigo-500 text-white shadow-sm hover:bg-indigo-600"
              }`}
              style={{ minHeight: 44, minWidth: 44 }}
            >
              {isCompleted ? "✓ 已完成" : "✓ 标记完成"}
            </motion.button>

            {/* 绿色播放按钮 — 点击弹出动画演示 */}
            <motion.button
              onClick={() => setShowAnimation(true)}
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              className="w-11 h-11 rounded-xl bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-sm transition-colors"
              title="观看动画演示"
              aria-label="播放动画演示"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </motion.button>

            <TaskVoiceRecorder taskId={task.id} targetWord={task.targetWord} />
          </motion.div>
        </div>

        {/* 庆祝 */}
        <AnimatePresence>
          {celebrating && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 200 }}
              className="absolute inset-0 rounded-xl flex items-center justify-center bg-white/85 backdrop-blur-sm z-10"
            >
              <div className="text-center">
                <motion.span className="text-6xl block mb-2"
                  animate={{ scale: [1, 1.3, 1], rotate: [0, -10, 10, -10, 0], y: [0, -15, 0] }}
                  transition={{ duration: 0.8 }}
                >
                  {config.character}
                </motion.span>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="text-sm font-bold text-indigo-600"
                >
                  {config.characterName}说：太棒啦！ 🎉
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 动画演示弹窗 */}
      <AnimationModal
        open={showAnimation}
        onClose={() => setShowAnimation(false)}
        imageUrl={task.animationUrl || ""}
        steps={config.animationSteps}
        title={`${task.scene} · ${task.targetWord}`}
        character={config.character}
        characterName={config.characterName}
        speechText={task.speechText || getSpeechByStrategy(task.strategy, task.targetWord)}
        audioUrl={task.audioUrl}
        timeline={timeline}
      />
    </>
  );
}

function getSceneColor(icon: string): string {
  const colors: Record<string, string> = { "🍳": "bg-orange-100", "🎮": "bg-purple-100", "🛁": "bg-blue-100", "🌙": "bg-indigo-100" };
  return colors[icon] || "bg-gray-100";
}
