"use client";

import { getGreeting, getTodayDateString } from "@/data/mock-data";
import { motion } from "framer-motion";

export default function GreetingHeader() {
  const greeting = getGreeting();
  const dateStr = getTodayDateString();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-between px-4 py-3 bg-transparent"
    >
      <div>
        <h1 className="text-xl font-bold font-display text-ft-ink">
          👋 {greeting}，妈妈
        </h1>
        <p className="text-sm text-ft-inkSoft mt-0.5">{dateStr}</p>
      </div>
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-ft-pine to-ft-trail flex items-center justify-center text-white text-lg font-bold shadow-md">
        宝
      </div>
    </motion.div>
  );
}
