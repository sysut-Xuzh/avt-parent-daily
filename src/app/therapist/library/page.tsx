"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CustomActivity {
  id: string;
  title: string;
  category: string;
  description: string;
  target_words: string[];
  instructions: string;
  animation_url: string | null;
  created_at: string;
}

export default function TherapistLibraryPage() {
  const router = useRouter();
  const [list, setList] = useState<CustomActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "自定义训练",
    description: "",
    targetWords: "",
    instructions: "",
    animationUrl: "",
  });
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const supabase = (await import("@/lib/supabase")).getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/custom-activities", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const d = await res.json();
      setList(d?.activities || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    setMsg("");
    if (!form.title.trim()) {
      setMsg("请填写训练名称");
      return;
    }
    setSaving(true);
    try {
      const supabase = (await import("@/lib/supabase")).getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/custom-activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: form.title.trim(),
          category: form.category.trim() || "自定义训练",
          description: form.description,
          targetWords: form.targetWords
            .split(/[、，,\s]+/)
            .map((s: string) => s.trim())
            .filter(Boolean),
          instructions: form.instructions,
          animationUrl: form.animationUrl.trim() || null,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setMsg("✅ 已创建");
        setForm({
          title: "",
          category: "自定义训练",
          description: "",
          targetWords: "",
          instructions: "",
          animationUrl: "",
        });
        load();
      } else {
        setMsg(d.error || "创建失败");
      }
    } catch {
      setMsg("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("确定删除该自定义训练？")) return;
    try {
      const supabase = (await import("@/lib/supabase")).getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch(`/api/custom-activities?id=${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const d = await res.json();
      if (d.success) load();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/therapist")}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          ←
        </button>
        <h1 className="text-base font-bold text-gray-800">📚 训练库（我的自定义训练）</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-4">
        {/* 新建表单 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">➕ 新建训练类型 / 内容</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">训练名称 *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="如：吹泡泡呼吸训练"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">分类</label>
              <input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="如：游戏互动"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">一句话说明</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="简要描述这个训练"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">
              目标词（空格 / 逗号分隔，可多个）
            </label>
            <input
              value={form.targetWords}
              onChange={(e) => setForm({ ...form, targetWords: e.target.value })}
              placeholder="如：泡泡 呼 吹"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">指导语 / 操作提示</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              placeholder="写给家长的话术与操作步骤"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">动画 URL（可选）</label>
            <input
              value={form.animationUrl}
              onChange={(e) => setForm({ ...form, animationUrl: e.target.value })}
              placeholder="https://...（留空则用通用动画）"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-teal-500 text-white text-sm font-semibold hover:bg-teal-600 disabled:opacity-50"
          >
            {saving ? "保存中…" : "💾 创建训练"}
          </button>
          {msg && <p className="text-xs text-gray-500 text-center">{msg}</p>}
        </div>

        {/* 列表 */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">已创建（{list.length}）</h2>
          {loading && <p className="text-xs text-gray-400">加载中…</p>}
          {!loading && list.length === 0 && (
            <p className="text-xs text-gray-400">
              还没有自定义训练。创建后可在「方案配置」里一键加入排课。
            </p>
          )}
          {list.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-xl p-3 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-800">
                    {a.title}
                    <span className="ml-1 text-[10px] text-teal-500 bg-teal-50 px-1.5 py-0.5 rounded">
                      {a.category}
                    </span>
                  </div>
                  {a.description && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{a.description}</p>
                  )}
                  {a.target_words?.length > 0 && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      🎯 {a.target_words.join("、")}
                    </p>
                  )}
                  {a.instructions && (
                    <p className="text-[11px] text-gray-500 mt-1 whitespace-pre-wrap">
                      {a.instructions}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="shrink-0 text-[11px] text-red-400 hover:text-red-600"
                >
                  🗑 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
