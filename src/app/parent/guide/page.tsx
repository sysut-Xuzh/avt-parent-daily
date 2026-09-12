"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import CoachTour, { FIRST_LOGIN_TOUR, MODULE_TOURS, type CoachStep } from "@/components/feature-guide/CoachTour";
import {
  GUIDE_MODULES,
  GUIDE_FAQ,
  FIRST_WEEK_PLAN,
  ONBOARDING_FLAG,
} from "@/lib/guide-content";

export default function FeatureGuidePage() {
  const router = useRouter();
  const [openModule, setOpenModule] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [tourSteps, setTourSteps] = useState<CoachStep[] | null>(null);

  const startTour = (steps: CoachStep[]) => setTourSteps(steps);
  const tourDone = () => {
    try {
      window.localStorage.setItem(ONBOARDING_FLAG, "1");
    } catch {
      /* ignore */
    }
    setTourSteps(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-lg">←</button>
        <h1 className="text-base font-bold text-gray-800">📚 功能导览</h1>
        <button
          onClick={() => startTour(FIRST_LOGIN_TOUR)}
          className="ml-auto text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full active:scale-95"
        >
          🔁 重新演示
        </button>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-5 pb-12">
        {/* 新手必看 */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2">🔰 新手必看</h2>
          <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => startTour(FIRST_LOGIN_TOUR)}
                className="text-left bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 active:scale-[0.98] transition-all"
              >
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <p className="text-sm font-extrabold text-indigo-800">3 分钟了解全部功能</p>
              </div>
              <p className="text-[11px] text-indigo-500/80 mt-1">第一次用就懂：跟着引导走一遍 8 个核心界面</p>
            </button>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🗓️</span>
                <p className="text-sm font-extrabold text-gray-800">首周训练指南</p>
              </div>
              <div className="space-y-2">
                {FIRST_WEEK_PLAN.map((p) => (
                  <div key={p.day} className="flex items-start gap-2">
                    <span className="shrink-0 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full mt-0.5">
                      {p.day}
                    </span>
                    <p className="text-[11px] text-gray-600 leading-snug">{p.task}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 按模块查看 */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2">📍 按模块查看</h2>
          <div className="space-y-2">
            {GUIDE_MODULES.map((m) => {
              const open = openModule === m.id;
              return (
                <div key={m.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setOpenModule(open ? null : m.id)}
                    className="w-full flex items-center gap-3 p-3.5 text-left active:scale-[0.99]"
                  >
                    <span className="text-xl">{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{m.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{m.desc}</p>
                    </div>
                    <motion.span animate={{ rotate: open ? 90 : 0 }} className="text-gray-300 text-sm">
                      ›
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <ol className="px-4 pb-4 pt-1 space-y-3">
                          {m.steps.map((s, i) => (
                            <li key={i} className="flex gap-2.5">
                              <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-500 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                                {i + 1}
                              </span>
                              <div>
                                <p className="text-[12px] font-bold text-gray-700">{s.title}</p>
                                <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{s.body}</p>
                              </div>
                            </li>
                          ))}
                        </ol>
                        {MODULE_TOURS[m.id] && (
                          <div className="px-4 pb-4">
                            <button
                              onClick={() => startTour(MODULE_TOURS[m.id])}
                              className="w-full py-2 rounded-xl bg-[#4F8CFF] text-white text-xs font-bold active:scale-95"
                            >
                              ▶ 演示本模块（手把手指哪点哪）
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* 常见问题 */}
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2">❓ 常见问题</h2>
          <div className="space-y-2">
            {GUIDE_FAQ.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center gap-2 p-3.5 text-left active:scale-[0.99]"
                  >
                    <span className="text-base">💡</span>
                    <p className="flex-1 text-[12px] font-semibold text-gray-700">{f.q}</p>
                    <motion.span animate={{ rotate: open ? 90 : 0 }} className="text-gray-300 text-sm">›</motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 text-[11px] text-gray-500 leading-relaxed">{f.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        <p className="text-center text-[10px] text-gray-300">
          功能导览随时可在「我的 / 设置 → 🎓 功能导览」回看
        </p>
      </div>

      <CoachTour open={tourSteps !== null} steps={tourSteps ?? []} onDone={tourDone} />
    </div>
  );
}
