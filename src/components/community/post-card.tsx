"use client";

import { useState } from "react";
import type { Post } from "@/data/community";

interface PostCardProps {
  post: Post;
  liked: boolean;
  favorited: boolean;
  onOpen: (id: string) => void;
  onLike: (id: string) => void;
  onFavorite: (id: string) => void;
  onShare: (post: Post) => void;
}

function Avatar({ avatar, role, size = 40 }: { avatar: string; role: string; size?: number }) {
  const bg = role === "therapist" ? "bg-sky-100" : role === "platform" ? "bg-rose-100" : "bg-indigo-50";
  return (
    <div
      className={`${bg} rounded-full flex items-center justify-center flex-shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {avatar}
    </div>
  );
}

export default function PostCard({ post, liked, favorited, onOpen, onLike, onFavorite, onShare }: PostCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLong = post.text.length > 80;
  const shownText = isLong && !expanded ? post.text.slice(0, 80) + "…" : post.text;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 mb-3">
      {/* 头部 */}
      <div className="flex items-center gap-2.5">
        <Avatar avatar={post.author.avatar} role={post.author.role} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-sm font-bold text-gray-800 truncate">{post.author.name}</span>
            {post.author.verified && (
              <span className="text-[10px] bg-sky-500 text-white px-1 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                ✓ 认证
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 truncate">
            {post.author.stageLabel}
            {post.author.org ? ` · ${post.author.org}` : ""} · {post.time}
          </p>
        </div>
        <button className="text-gray-300 text-lg px-1 active:scale-90" onClick={(e) => e.stopPropagation()}>⋯</button>
      </div>

      {/* 正文 */}
      <p
        className="text-sm text-gray-700 mt-2.5 leading-relaxed whitespace-pre-line cursor-pointer"
        onClick={() => onOpen(post.id)}
      >
        {shownText}
        {isLong && (
          <span
            className="text-indigo-500 font-medium ml-1"
            onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          >
            {expanded ? "收起" : "展开"}
          </span>
        )}
      </p>

      {/* 媒体 */}
      {post.media.length > 0 && (
        <div
          className={`mt-2.5 grid gap-1.5 ${post.media.length === 1 ? "grid-cols-1" : post.media.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}
          onClick={() => onOpen(post.id)}
        >
          {post.media.map((m, i) => (
            <div
              key={i}
              className="relative rounded-xl overflow-hidden flex items-center justify-center"
              style={{ background: m.gradient, aspectRatio: post.media.length === 1 ? "16/9" : "1/1" }}
            >
              {m.kind === "video" ? (
                <>
                  <span className="absolute inset-0 flex items-center justify-center text-white/90 text-3xl">▶</span>
                  {m.duration && (
                    <span className="absolute bottom-1 right-1 text-[10px] text-white bg-black/40 px-1 rounded">
                      {m.duration}
                    </span>
                  )}
                </>
              ) : null}
              <span className="text-[10px] text-white/80 bg-black/20 px-1.5 py-0.5 rounded absolute bottom-1 left-1">
                {m.caption}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 标签 + 已实践徽章 */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
        {post.practiced && (
          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium border border-emerald-100">
            ✅ 已实践
          </span>
        )}
        {post.tags.map((t, i) => (
          <span key={i} className="text-[11px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
            #{t}
          </span>
        ))}
      </div>

      {/* 治疗师回复摘要 */}
      {post.therapistReply && (
        <div className="mt-2.5 bg-sky-50 border border-sky-100 rounded-xl p-2.5">
          <p className="text-[11px] text-sky-600 font-semibold mb-0.5 flex items-center gap-1">
            🩺 治疗师专业回复
          </p>
          <p className="text-xs text-gray-600 leading-relaxed">{post.therapistReply}</p>
        </div>
      )}

      {/* 负面情绪心理支持卡 */}
      {post.negative && (
        <div className="mt-2.5 bg-violet-50 border border-violet-100 rounded-xl p-2.5">
          <p className="text-[11px] text-violet-600 font-semibold mb-1 flex items-center gap-1">💙 你并不孤单</p>
          <p className="text-xs text-gray-600 leading-relaxed">
            康复路上有高峰也有低谷，这些都是正常的。需要时可以
            <span className="text-violet-600 font-medium"> 查看心理支持文章 </span>
            或
            <span className="text-violet-600 font-medium"> 联系平台心理顾问</span>。
          </p>
        </div>
      )}

      {/* 底部互动 */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50 text-gray-500">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1 text-xs ${liked ? "text-rose-500" : ""} active:scale-90`}
        >
          <span className="text-base">{liked ? "❤️" : "🤍"}</span> {post.likes}
        </button>
        <button onClick={() => onOpen(post.id)} className="flex items-center gap-1 text-xs active:scale-90">
          <span className="text-base">💬</span> {post.comments.length}
        </button>
        <button
          onClick={() => onFavorite(post.id)}
          className={`flex items-center gap-1 text-xs ${favorited ? "text-amber-500" : ""} active:scale-90`}
        >
          <span className="text-base">{favorited ? "⭐" : "☆"}</span> {post.favorites}
        </button>
        <button onClick={() => onShare(post)} className="flex items-center gap-1 text-xs active:scale-90">
          <span className="text-base">📤</span> {post.shares}
        </button>
      </div>
    </div>
  );
}
