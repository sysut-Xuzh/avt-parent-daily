"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type ContentType = "article" | "paper" | "book" | "podcast";

interface ContentItem {
  id: string;
  therapist_id: string;
  type: ContentType;
  title: string;
  url: string | null;
  summary: string;
  author: string | null;
  file_url: string | null;
  tags: string[];
  created_at: string;
}

const TYPE_LABELS: Record<ContentType, string> = {
  article: "📝 文章/链接/推文",
  paper: "📄 研究/论文",
  book: "📚 书籍",
  podcast: "🎧 播客",
};

export default function TherapistContentPage() {
  const router = useRouter();
  const [list, setList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    type: "article" as ContentType,
    title: "",
    summary: "",
    url: "",
    author: "",
    fileUrl: "",
    tags: "",
  });
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { getSupabaseBrowser } = await import("@/lib/supabase");
      const supabase = getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/content-library?mine=1", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const d = await res.json();
      setList(d?.items || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFile = async (file: File) => {
    setUploading(true);
    setMsg("");
    try {
      const { getSupabaseBrowser } = await import("@/lib/supabase");
      const supabase = getSupabaseBrowser();
      const { data: sd } = await supabase.auth.getSession();
      const uid = sd.session?.user.id || "anon";
      const path = `${uid}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
      const { error } = await supabase.storage
        .from("content-files")
        .upload(path, file, { upsert: true });
      if (error) {
        setMsg("上传失败：" + error.message);
        return;
      }
      const { data: pub } = supabase.storage.from("content-files").getPublicUrl(path);
      setForm((f) => ({ ...f, fileUrl: pub.publicUrl }));
      setMsg("✅ 文件已上传");
    } catch {
      setMsg("上传出错");
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    setMsg("");
    if (!form.title.trim()) {
      setMsg("请填写标题");
      return;
    }
    setSaving(true);
    try {
      const { getSupabaseBrowser } = await import("@/lib/supabase");
      const supabase = getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const tags = form.tags
        .split(/[、，,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch("/api/content-library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: form.type,
          title: form.title.trim(),
          summary: form.summary,
          url: form.url || null,
          author: form.author || null,
          file_url: form.fileUrl || null,
          tags,
        }),
      });
      const d = await res.json();
      if (d.success) {
        setMsg("✅ 已发布");
        setForm({ type: "article", title: "", summary: "", url: "", author: "", fileUrl: "", tags: "" });
        load();
      } else {
        setMsg(d.error || "发布失败");
      }
    } catch {
      setMsg("网络错误");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (typeof window !== "undefined" && !window.confirm("确定删除这条内容？")) return;
    try {
      const { getSupabaseBrowser } = await import("@/lib/supabase");
      const supabase = getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch(`/api/content-library?id=${id}`, {
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
        <h1 className="text-base font-bold text-gray-800">💡 内容库（我的策展）</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-4">
        {/* 新建表单 */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">➕ 分享一条内容</h2>
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">类型</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TYPE_LABELS) as ContentType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`text-xs px-2.5 py-1.5 rounded-full border ${
                    form.type === t
                      ? "bg-indigo-500 text-white border-indigo-500"
                      : "bg-white text-gray-500 border-gray-200"
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">标题 *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="如：婴幼儿听觉口语训练最新研究"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">链接（文章/推文/论文/书籍/播客 URL）</label>
            <input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          {(form.type === "paper" || form.type === "book") && (
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">作者 / 来源</label>
              <input
                value={form.author}
                onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
                placeholder="如：XX 大学 听力学团队"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          )}
          {(form.type === "paper" || form.type === "book") && (
            <div>
              <label className="text-[11px] text-gray-400 block mb-1">上传文件（论文 PDF / 封面图）</label>
              <input
                type="file"
                accept=".pdf,image/*"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="w-full text-xs"
              />
              {form.fileUrl && (
                <p className="text-[11px] text-green-600 mt-1">已上传：{form.fileUrl.slice(0, 36)}…</p>
              )}
            </div>
          )}
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">一句话简介</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              rows={2}
              placeholder="为什么推荐这条内容？"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="text-[11px] text-gray-400 block mb-1">标签（空格/逗号分隔）</label>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="如：早期干预 家庭训练"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 disabled:opacity-50"
          >
            {saving ? "发布中…" : "📤 发布到内容库"}
          </button>
          {uploading && <p className="text-xs text-gray-400 text-center">文件上传中…</p>}
          {msg && <p className="text-xs text-gray-500 text-center">{msg}</p>}
        </div>

        {/* 列表 */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">已发布（{list.length}）</h2>
          {loading && <p className="text-xs text-gray-400">加载中…</p>}
          {!loading && list.length === 0 && (
            <p className="text-xs text-gray-400">还没有内容。发布后家长端「知识资源」里可见。</p>
          )}
          {list.map((a) => (
            <div key={a.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-800">
                    {a.title}
                    <span className="ml-1 text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {TYPE_LABELS[a.type]}
                    </span>
                  </div>
                  {a.author && <p className="text-[11px] text-gray-400 mt-0.5">📎 {a.author}</p>}
                  {a.summary && <p className="text-[11px] text-gray-500 mt-1">{a.summary}</p>}
                  {a.url && (
                    <a href={a.url} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-500 underline break-all">
                      🔗 查看链接
                    </a>
                  )}
                  {a.file_url && (
                    <a href={a.file_url} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-500 underline break-all ml-2">
                      📄 文件
                    </a>
                  )}
                  {a.tags?.length > 0 && <p className="text-[11px] text-gray-400 mt-1">🏷 {a.tags.join("、")}</p>}
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
