"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface FamilyDetailProps {
  babyName: string;
  babyId: string;
  onClose: () => void;
}

export default function FamilyDetail({ babyName, onClose }: FamilyDetailProps) {
  const [logs, setLogs] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);

  useState(() => {
    fetch("/api/logs?baby_id=&date=")
      .then(r => r.json())
      .then(d => setLogs(d.tasks || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700">👶 {babyName} — 本周详情</h3>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">关闭 ✕</button>
      </div>

      {loading ? (
        <p className="text-xs text-gray-400 text-center py-6">加载中...</p>
      ) : !logs || logs.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">暂无执行记录</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {logs.map((task: any, i: number) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 text-xs">
              <span className="w-6 text-center">{task.sceneIcon || "📋"}</span>
              <span className="text-gray-500 w-10">{task.time}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                task.status === "completed" ? "bg-green-50 text-green-600" :
                task.status === "skipped" ? "bg-red-50 text-red-400" : "bg-gray-50 text-gray-400"
              }`}>
                {task.status === "completed" ? "✅" : task.status === "skipped" ? "⏭️" : "⏳"}
              </span>
              <span className="flex-1 text-gray-600 truncate">{task.targetWord}</span>
              <span className="text-gray-300">{task.strategy}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
