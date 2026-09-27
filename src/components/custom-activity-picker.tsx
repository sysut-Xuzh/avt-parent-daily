"use client";

import { useState, useEffect } from "react";

interface CustomActivity {
  id: string;
  title: string;
  category: string;
  description?: string;
  target_words?: string[];
  instructions?: string;
}

export default function CustomActivityPicker({
  onAdd,
}: {
  onAdd: (a: {
    activityId: string;
    targetWord: string;
    scene: string;
    customName: string;
    customInstruction: string;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<CustomActivity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const supabase = (await import("@/lib/supabase")).getSupabaseBrowser();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch("/api/custom-activities", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const d = await res.json();
        if (d?.activities) setList(d.activities);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 rounded-xl border border-dashed border-teal-300 text-teal-600 text-sm font-medium hover:bg-teal-50 transition-colors"
      >
        ＋ 📚 从「我的自定义训练」添加
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-teal-100 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-teal-700">📚 我的自定义训练</span>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          收起
        </button>
      </div>
      {loading && <p className="text-xs text-gray-400">加载中…</p>}
      {!loading && list.length === 0 && (
        <p className="text-xs text-gray-400">
          还没有自定义训练，去{" "}
          <a href="/therapist/library" className="text-teal-600 underline">
            训练库
          </a>{" "}
          创建。
        </p>
      )}
      {list.map((a) => (
        <div
          key={a.id}
          className="flex items-start justify-between gap-2 border border-gray-100 rounded-lg p-2"
        >
          <div className="min-w-0">
            <div className="text-sm font-medium text-gray-800">
              {a.title}
              <span className="ml-1 text-[10px] text-teal-500 bg-teal-50 px-1.5 py-0.5 rounded">
                {a.category}
              </span>
            </div>
            {a.description && (
              <p className="text-[11px] text-gray-400 truncate">{a.description}</p>
            )}
          </div>
          <button
            onClick={() =>
              onAdd({
                activityId: `custom:${a.id}`,
                targetWord: a.target_words?.[0] || "",
                scene: "游戏",
                customName: a.title,
                customInstruction: a.instructions || "",
              })
            }
            className="shrink-0 px-2.5 py-1 rounded-lg bg-teal-500 text-white text-xs font-medium hover:bg-teal-600"
          >
            ＋ 加入排课
          </button>
        </div>
      ))}
    </div>
  );
}
