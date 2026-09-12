"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PostCard from "@/components/community/post-card";
import PostDetail from "@/components/community/post-detail";
import {
  getFeed,
  toggleLike,
  toggleFavorite,
  addComment,
  type FeedResult,
} from "@/lib/community-service";

const EMPTY_FEED: FeedResult = { posts: [], liked: {}, favorited: {}, backend: false };

// 治疗师端康复圈：直接复用家长端的真实后端数据源（getFeed 登录后读 Supabase posts）。
// 治疗师可浏览 / 点赞 / 评论（以治疗师身份回复），与真实用户数据同一张共享表。
export default function TherapistCommunity() {
  const [feed, setFeed] = useState<FeedResult>(EMPTY_FEED);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    getFeed()
      .then(setFeed)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (toast) {
      const t = window.setTimeout(() => setToast(null), 2200);
      return () => window.clearTimeout(t);
    }
  }, [toast]);

  const posts = feed.posts;
  const detailPost = detailId ? posts.find((p) => p.id === detailId) || null : null;

  const onLike = useCallback(async (id: string) => {
    setFeed(await toggleLike(id, !!feed.liked[id]));
  }, [feed.liked]);
  const onFavorite = useCallback(async (id: string) => {
    setFeed(await toggleFavorite(id, !!feed.favorited[id]));
  }, [feed.favorited]);
  const onAddComment = useCallback(async (id: string, text: string) => {
    setFeed(await addComment(id, text));
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">康复圈</h2>
        <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-600">
          {mounted && feed.backend ? "☁️ 云端真实数据" : "本地演示数据"}
        </span>
      </div>
      <p className="text-xs text-gray-400">
        治疗师可在此浏览家长动态、点赞与专业回复，数据来自 Supabase 共享库。
      </p>

      {loading ? (
        <div className="text-center py-16 text-sm text-gray-300">加载中…</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-4xl block mb-2">🌱</span>
          <p className="text-sm text-gray-400">康复圈还没有内容</p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liked={!!feed.liked[post.id]}
              favorited={!!feed.favorited[post.id]}
              onOpen={setDetailId}
              onLike={onLike}
              onFavorite={onFavorite}
              onShare={() => setToast("已复制分享链接")}
            />
          ))}
        </motion.div>
      )}

      <PostDetail
        post={detailPost}
        liked={detailPost ? !!feed.liked[detailPost.id] : false}
        favorited={detailPost ? !!feed.favorited[detailPost.id] : false}
        onClose={() => setDetailId(null)}
        onLike={onLike}
        onFavorite={onFavorite}
        onAddComment={onAddComment}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-xs px-4 py-2 rounded-full shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
