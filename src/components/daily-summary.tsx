"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

interface DailySummaryProps {
  completed: number;
  total: number;
  tasks: { targetWord: string; completed: boolean }[];
}

function generateSummary(rate: number, completed: number, total: number, words: string[]): { summary: string; suggestion: string } {
  const wordList = words.filter(Boolean).join("、") || "目标词";

  if (rate >= 100) {
    return {
      summary: `🎉 太棒了！今天${total}个任务全部完成！${words.slice(0, 3).join("、")}都练习到了，继续加油！`,
      suggestion: `明天可以试试新的目标词哦 😊`,
    };
  }
  if (rate >= 50) {
    return {
      summary: `👏 今天完成了${completed}/${total}个任务，很不错！「${wordList}」的练习效果很好。`,
      suggestion: `明天试试多练习还没完成的词吧 💪`,
    };
  }
  if (rate > 0) {
    return {
      summary: `😊 今天完成了${completed}/${total}个任务，辛苦了。`,
      suggestion: `今天可以先休息，明天继续加油 🌙`,
    };
  }
  return {
    summary: `📋 今天还没有完成任务哦，去看看训练清单吧！`,
    suggestion: `每天坚持一点点，宝宝在进步 💪`,
  };
}

export default function DailySummary({ completed, total, tasks }: DailySummaryProps) {
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const words = useMemo(() => Array.from(new Set(tasks.map((t) => t.targetWord))), [tasks]);
  const { summary, suggestion } = useMemo(() => generateSummary(rate, completed, total, words), [rate, completed, total, words]);

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (rate / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 md:mx-0 mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100"
    >
      <div className="flex items-center gap-4">
        {/* 进度环 */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={radius} fill="none" stroke="#e0e7ff" strokeWidth="6" />
            <motion.circle
              cx="40" cy="40" r={radius} fill="none" stroke="#6366f1" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              transform="rotate(-90 40 40)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-indigo-600">{rate}%</span>
          </div>
        </div>

        {/* 文案 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-bold text-indigo-700 mb-1">📋 今日小结</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
          {suggestion && <p className="text-xs text-indigo-500 mt-1">💡 {suggestion}</p>}
          <p className="text-[10px] text-gray-400 mt-1">{completed}/{total} 个任务完成</p>
        </div>
      </div>
    </motion.div>
  );
}
