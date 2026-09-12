"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Post } from "@/data/community";

interface PostDetailProps {
  post: Post | null;
  liked: boolean;
  favorited: boolean;
  onClose: () => void;
  onLike: (id: string) => void;
  onFavorite: (id: string) => void;
  onAddComment: (id: string, text: string) => void;
}

export default function PostDetail({ post, liked, favorited, onClose, onLike, onFavorite, onAddComment }: PostDetailProps) {
  const [draft, setDraft] = useState("");

  // 评论排序：治疗师专业回复置顶
  const comments = post ? [...post.comments].sort((a, b) => (b.isProReply ? 1 : 0) - (a.isProReply ? 1 : 0)) : [];

  return (
    <AnimatePresence>
      {post && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 280 }}
            className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部 */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700">帖子详情</h3>
              <button onClick={onClose} className="w-7 h-7 rounded-full bg-gray-100 text-gray-400 text-xs hover:bg-gray-200">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* 头部 */}
              <div className="flex items-center gap-2.5">
                <div className={`${post.author.role === "therapist" ? "bg-sky-100" : "bg-indigo-50"} rounded-full flex items-center justify-center w-10 h-10 text-xl`}>
                  {post.author.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-gray-800">{post.author.name}</span>
                    {post.author.verified && (
                      <span className="text-[10px] bg-sky-500 text-white px-1 py-0.5 rounded-full font-semibold">✓ 认证</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">{post.author.stageLabel} · {post.time}</p>
                </div>
              </div>

              {/* 正文 */}
              <p className="text-sm text-gray-700 mt-3 leading-relaxed whitespace-pre-line">{post.text}</p>

              {/* 媒体 */}
              {post.media.length > 0 && (
                <div className={`mt-3 grid gap-2 ${post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                  {post.media.map((m, i) => (
                    <div
                      key={i}
                      className="relative rounded-xl overflow-hidden flex items-center justify-center"
                      style={{ background: m.gradient, aspectRatio: "4/3" }}
                    >
                      {m.kind === "video" && <span className="text-white/90 text-4xl">▶</span>}
                      <span className="absolute bottom-1 left-1 text-[10px] text-white/80 bg-black/20 px-1.5 py-0.5 rounded">
                        {m.caption}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 标签 */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {post.practiced && (
                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">✅ 已实践</span>
                )}
                {post.tags.map((t, i) => (
                  <span key={i} className="text-[11px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">#{t}</span>
                ))}
              </div>

              {/* 负面支持卡 */}
              {post.negative && (
                <div className="mt-3 bg-violet-50 border border-violet-100 rounded-xl p-3">
                  <p className="text-[11px] text-violet-600 font-semibold mb-1 flex items-center gap-1">💙 你并不孤单</p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    康复路上有高峰也有低谷，这些都是正常的。可查看心理支持文章，或联系平台心理顾问。
                  </p>
                </div>
              )}

              {/* 评论区 */}
              <div className="mt-4">
                <p className="text-xs font-bold text-gray-700 mb-2">评论 {post.comments.length}</p>
                <div className="space-y-3">
                  {comments.length === 0 && <p className="text-xs text-gray-400">还没有评论，来抢沙发～</p>}
                  {comments.map((c) => (
                    <div key={c.id} className={`flex gap-2 ${c.isProReply ? "bg-sky-50 rounded-xl p-2 -mx-2" : ""}`}>
                      <div className={`${c.role === "therapist" ? "bg-sky-100" : "bg-indigo-50"} rounded-full flex items-center justify-center w-8 h-8 text-sm flex-shrink-0`}>
                        {c.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold text-gray-700">{c.authorName}</span>
                          {c.verified && <span className="text-[9px] bg-sky-500 text-white px-1 rounded-full">✓</span>}
                          {c.isProReply && <span className="text-[9px] bg-sky-500 text-white px-1 rounded-full">专业回复</span>}
                          <span className="text-[10px] text-gray-400">{c.time}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 底部：互动 + 评论输入 */}
            <div className="border-t border-gray-100 p-3">
              <div className="flex items-center justify-between mb-2 text-gray-500">
                <button onClick={() => onLike(post.id)} className={`flex items-center gap-1 text-xs ${liked ? "text-rose-500" : ""}`}>
                  <span className="text-lg">{liked ? "❤️" : "🤍"}</span> {post.likes}
                </button>
                <button onClick={() => onFavorite(post.id)} className={`flex items-center gap-1 text-xs ${favorited ? "text-amber-500" : ""}`}>
                  <span className="text-lg">{favorited ? "⭐" : "☆"}</span> {post.favorites}
                </button>
                <span className="text-xs flex items-center gap-1">📤 {post.shares}</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="说点温暖的鼓励…"
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-indigo-300"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && draft.trim()) {
                      onAddComment(post.id, draft.trim());
                      setDraft("");
                    }
                  }}
                />
                <button
                  disabled={!draft.trim()}
                  onClick={() => { onAddComment(post.id, draft.trim()); setDraft(""); }}
                  className="bg-indigo-500 text-white text-sm px-4 py-2 rounded-full font-medium disabled:opacity-40 active:scale-95"
                >
                  发送
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
