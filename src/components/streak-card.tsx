"use client";

import { motion } from "framer-motion";
import { UserProgress } from "@/types";

interface StreakCardProps {
  progress: UserProgress;
}

export default function StreakCard({ progress }: StreakCardProps) {
  const percent = Math.round(
    (progress.todayCompleted / progress.todayTotal) * 100
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mx-4 md:mx-0 rounded-2xl bg-gradient-to-r from-amber-50 to-yellow-50 p-4 shadow-sm border border-amber-100"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              连续打卡第 <span className="text-amber-600">{progress.streakDays}</span> 天
            </p>
            <p className="text-xs text-gray-500">
              今日 {progress.todayCompleted}/{progress.todayTotal}
            </p>
          </div>
        </div>
        <div className="text-3xl font-bold text-amber-500">{percent}%</div>
      </div>
      <div className="w-full h-2.5 bg-amber-200/60 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-400"
        />
      </div>
    </motion.div>
  );
}
