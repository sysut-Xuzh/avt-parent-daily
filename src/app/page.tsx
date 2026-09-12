"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(true);

  // 首页只做一件事：按登录状态跳转
  // 已登录 → 按角色直达对应端（家长端只能看到家长端）
  // 未登录 → 进登录页
  useEffect(() => {
    let role: string | null = null;
    try {
      role = localStorage.getItem("avt_role");
    } catch {
      role = null;
    }

    const timer = setTimeout(() => {
      if (role === "parent") {
        router.replace("/parent");
      } else if (role === "therapist") {
        router.replace("/therapist");
      } else {
        router.replace("/login");
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <motion.span
            className="text-6xl block mb-4"
            animate={{ y: [0, -6, 0], rotate: [0, -3, 3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            🐰
          </motion.span>
          <h1 className="text-2xl font-bold text-gray-800">
            AVT 听损儿童康复训练
          </h1>
          <p className="text-sm text-gray-400 mt-1">AI 多模态听觉康复平台</p>
        </motion.div>

        {/* 加载提示：自动跳转中 */}
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-400 mt-4">正在进入…</p>
          {redirecting && (
            <p className="text-xs text-gray-300 mt-2">请稍候，正在跳转</p>
          )}
        </div>
      </div>
    </div>
  );
}
