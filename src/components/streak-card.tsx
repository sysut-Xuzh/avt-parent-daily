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
      className="mx-4 md:mx-0 rounded-2xl bg-gradient-to-r from-[#FBF3E4] to-ft-paper p-4 shadow-sm border border-ft-dusk/30"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <div>
            <p className="text-sm font-semibold text-ft-ink">
              连续打卡第 <span className="text-ft-trail">{progress.streakDays}</span> 天
            </p>
            <p className="text-xs text-ft-inkSoft">
              今日 {progress.todayCompleted}/{progress.todayTotal}
            </p>
          </div>
        </div>
        <div className="text-3xl font-bold font-display text-ft-dusk">{percent}%</div>
      </div>
      <div className="w-full h-2.5 bg-ft-sand/70 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-ft-pine to-ft-dusk"
        />
      </div>
    </motion.div>
  );
}
