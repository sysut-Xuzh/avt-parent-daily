"use client";

import { useBaby } from "@/components/baby-provider";

/**
 * 当前孩子切换器（方案 阶段一·步骤6）
 * 仅在家庭有多个孩子时显示。切换即更新全局"当前选中孩子"状态，
 * 所有评级写入、日历拉取、推荐展示均按该 baby_id 读写。
 */
export default function BabySwitcher() {
  const { babies, currentBabyId, setCurrentBabyId, loading } = useBaby();
  if (loading || babies.length <= 1) return null;
  return (
    <div className="flex items-center gap-1.5 mx-4 md:mx-6 mt-2">
      <span className="text-xs text-gray-400">当前孩子</span>
      <select
        value={currentBabyId ?? ""}
        onChange={(e) => setCurrentBabyId(e.target.value || null)}
        className="text-xs rounded-full border border-gray-200 px-2.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
      >
        {babies.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </div>
  );
}
