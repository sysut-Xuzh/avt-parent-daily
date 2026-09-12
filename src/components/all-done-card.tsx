"use client";

import { motion } from "framer-motion";

interface AllDoneCardProps {
  onShare?: () => void;
}

export default function AllDoneCard({ onShare }: AllDoneCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-4 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-6 text-center shadow-md"
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, -10, 0] }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="text-5xl mb-3"
      >
        🎊
      </motion.div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">
        太棒了！
      </h2>
      <p className="text-gray-500 text-sm mb-4">今日任务全部完成！</p>
      {onShare && (
        <button
          onClick={onShare}
          className="bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-600 active:bg-indigo-700 transition-all active:scale-95"
          style={{ minHeight: 44, minWidth: 44 }}
        >
          📣 分享给治疗师
        </button>
      )}
    </motion.div>
  );
}
