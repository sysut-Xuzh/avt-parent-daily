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

const TYPE_TABS: { key: ContentType | "all"; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "article", label: "📝 文章" },
  { key: "paper", label: "📄 论文" },
  { key: "book", label: "📚 书籍" },
  { key: "podcast", label: "🎧 播客" },
];

const TYPE_ICON: Record<ContentType, string> = {
  article: "📝",
  paper: "📄",
  book: "📚",
  podcast: "🎧",
};

export default function ParentResourcesPage() {
  const router = useRouter();
  const [list, setList] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ContentType | "all">("all");

  const load = async () => {
    setLoading(true);
    try {
      const { getSupabaseBrowser } = await import("@/lib/supabase");
      const supabase = getSupabaseBrowser();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/content-library", {
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

  const filtered = tab === "all" ? list : list.filter((i) => i.type === tab);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => router.push("/parent")}
          className="text-gray-400 hover:text-gray-600 text-lg"
        >
          ←
        </button>
        <h1 className="text-base font-bold text-gray-800">📚 知识资源</h1>
      </header>

      <div className="px-4 pt-2">
        <div className="flex gap-1 overflow-x-auto -mx-4 px-4">
          {TYPE_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
                tab === t.key
                  ? "bg-indigo-500 text-white"
                  : "bg-white text-gray-500 border border-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-3">
        {loading && <p className="text-xs text-gray-400">加载中…</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-xs text-gray-400">暂无内容。治疗师发布后会显示在这里。</p>
        )}
        {filtered.map((a) => (
          <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{TYPE_ICON[a.type]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800">{a.title}</p>
                {a.author && <p className="text-[11px] text-gray-400 mt-0.5">📎 {a.author}</p>}
                {a.summary && <p className="text-[12px] text-gray-500 mt-1 leading-snug">{a.summary}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {a.url && (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full"
                    >
                      🔗 查看
                    </a>
                  )}
                  {a.file_url && (
                    <a
                      href={a.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full"
                    >
                      📄 文件
                    </a>
                  )}
                  {a.tags?.map((t) => (
                    <span key={t} className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
