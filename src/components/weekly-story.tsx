"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const storyTemplates = [
  {
    pattern: (rate: number) => rate >= 80,
    title: "🌟 进步的一周",
    story: (d: { daysActive: number; completed: number; total: number; rate: number; words: string[] }) =>
      `这一周，宝宝训练了${d.daysActive}天，完成了${d.completed}个微任务，完成率高达${d.rate}%！\n\n` +
      `练习的词：${d.words.join("、")}\n\n` +
      `最棒的是，宝宝对「${d.words[0] || ""}」的反应越来越好了，已经能稳定地转向声源。` +
      `治疗师点评：本周进步明显，继续保持！下周可以尝试增加「听觉先行」策略的使用频次。`,
  },
  {
    pattern: (rate: number) => rate >= 50,
    title: "💪 稳步前进",
    story: (d: { daysActive: number; completed: number; total: number; rate: number; words: string[] }) =>
      `这一周训练了${d.daysActive}天，完成了${d.completed}/${d.total}个任务（完成率${d.rate}%）。\n\n` +
      `练习了 ${d.words.join("、")} 等词汇。\n\n` +
      `其中「${d.words[0] || ""}」的完成度最好，宝宝已经能主动寻找声源。` +
      `建议下周继续巩固，每次练习后多等3-5秒，给宝宝足够的反应时间。`,
  },
  {
    pattern: (rate: number) => rate > 0,
    title: "🌱 小小进步",
    story: (d: { daysActive: number; completed: number; total: number; rate: number; words: string[] }) =>
      `这一周训练了${d.daysActive}天，完成了${d.completed}/${d.total}个任务。\n\n` +
      `练习了 ${d.words.join("、")}。\n\n` +
      `虽然完成率只有${d.rate}%，但每一天的练习都在帮助宝宝建立听觉通路。` +
      `治疗师建议：不要给自己太大压力，哪怕每天只完成1个任务，也是进步。` +
      `下周可以尝试把任务分散在不同场景，利用碎片时间完成。`,
  },
  {
    pattern: () => true,
    title: "📋 本周回顾",
    story: (d: { daysActive: number; completed: number; total: number; words: string[] }) =>
      `本周训练了${d.daysActive}天，完成了${d.completed}/${d.total}个任务。\n\n` +
      `练习了 ${d.words.join("、")}。\n\n` +
      `下周继续加油！每天进步一点点，宝宝会越来越棒的 💪`,
  },
];

export default function WeeklyStory({ completed = 0, total = 0, tasks = [] }: { completed?: number; total?: number; tasks?: { targetWord: string; completed: boolean }[] }) {
  const [visible, setVisible] = useState(false);

  if (!visible) {
    return (
      <div className="mx-4 md:mx-0 mt-3">
        <button onClick={() => setVisible(true)}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 text-amber-700 text-sm font-medium hover:from-amber-100 transition-all"
        >
          🌟 查看本周进步故事
        </button>
      </div>
    );
  }

  const daysActive = Math.max(1, Math.round((completed / Math.max(total, 1)) * 7));
  const words = [...new Set(tasks.map((t) => t.targetWord))];
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const template = storyTemplates.find((t) => t.pattern(rate)) || storyTemplates[3];
  const storyText = template.story({ daysActive, completed, total, rate, words });
  const title = template.title;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="mx-4 md:mx-0 mt-3 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-5 border border-amber-200 shadow-sm"
    >
      <div className="text-center mb-3">
        <span className="text-3xl block mb-2">🌟</span>
        <h3 className="text-base font-bold text-amber-800">{title}</h3>
      </div>
      <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line mb-3">{storyText}</p>
      <div className="flex justify-center gap-4 text-xs text-amber-600 pt-2 border-t border-amber-200/50">
        <span>📅 {daysActive}天</span>
        <span>✅ {completed}/{total}</span>
        <span>📈 {rate}%</span>
        <span>📖 {words.join("、")}</span>
      </div>
    </motion.div>
  );
}
