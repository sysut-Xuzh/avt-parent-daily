"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/bottom-nav";
import { bottomTabs, mockTasks } from "@/data/mock-data";
import type { TabId } from "@/types";
import { CHANNELS, CURRENT_STAGE, type ChannelId, type Post, type PublishInput } from "@/data/community";
import {
  getFeed,
  toggleLike,
  toggleFavorite,
  addComment,
  createPost,
  type FeedResult,
} from "@/lib/community-service";
import PostCard from "@/components/community/post-card";
import PostDetail from "@/components/community/post-detail";
import PublishModal from "@/components/community/publish-modal";

const EMPTY_FEED: FeedResult = { posts: [], liked: {}, favorited: {}, backend: false };

export default function CommunityPage() {
  const router = useRouter();
  const [feed, setFeed] = useState<FeedResult>(EMPTY_FEED);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [channel, setChannel] = useState<ChannelId>("recommend");
  const [query, setQuery] = useState("");
  const [sameStage, setSameStage] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
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

  const filtered = useMemo(() => {
    let list = posts;
    if (channel !== "recommend") list = list.filter((p) => p.channel === channel);
    if (sameStage) {
      list = list.filter(
        (p) => p.type === "therapist" || p.type === "system" || p.author.stage === CURRENT_STAGE
      );
    }
    const q = query.trim();
    if (q) {
      list = list.filter(
        (p) =>
          p.text.includes(q) ||
          p.author.name.includes(q) ||
          p.tags.some((t) => t.includes(q))
      );
    }
    return list;
  }, [posts, channel, sameStage, query]);

  const detailPost = useMemo<Post | null>(
    () => (detailId ? posts.find((p) => p.id === detailId) || null : null),
    [detailId, posts]
  );

  const todayTask = mockTasks[0]?.targetWord;

  const handleTabChange = (tab: TabId) => {
    if (tab === "profile") router.push("/parent/settings");
    else if (tab === "hearing") router.push("/parent/hearing-test");
    else if (tab === "learning") router.push("/parent/daily-learning");
    else if (tab === "tasks") router.push("/parent");
  };

  const onLike = useCallback(async (id: string) => {
    setFeed(await toggleLike(id, !!feed.liked[id]));
  }, [feed.liked]);
  const onFavorite = useCallback(async (id: string) => {
    setFeed(await toggleFavorite(id, !!feed.favorited[id]));
  }, [feed.favorited]);
  const onAddComment = useCallback(async (id: string, text: string) => {
    setFeed(await addComment(id, text));
  }, []);
  const onShare = useCallback((post: Post) => {
    setToast("已复制分享链接，去和更多家长交流吧 💬");
  }, []);
  const onPublish = useCallback(async (input: PublishInput) => {
    setPublishOpen(false);
    setLoading(true);
    setFeed(await createPost(input));
    setLoading(false);
    setToast("发布成功！已同步到成长日历 💬");
  }, []);

  // 积分展示：后端模式用 点赞+收藏 作代理；本地模式用真实积分
  const points = feed.backend
    ? Object.keys(feed.liked).length + Object.keys(feed.favorited).length
    : feed.points ?? 0;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 md:bg-transparent">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="md:px-6 pt-2">
          {/* 头部 */}
          <div className="flex items-end justify-between px-4 md:px-0 pt-3">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => router.push("/parent/community/profile")}
                className="w-11 h-11 rounded-full bg-indigo-50 flex items-center justify-center text-2xl border border-indigo-100 active:scale-90"
                aria-label="进入个人主页"
              >
                🐰
              </button>
              <div>
                <h1 className="text-2xl font-extrabold text-gray-800">康复圈</h1>
                <p className="text-xs text-gray-400 mt-0.5">家长康复日记 · 治疗师专业点评</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400">我的积分</p>
              <p className="text-base font-extrabold text-amber-500">🌟 {mounted ? points : 0}</p>
            </div>
          </div>

          {/* 三条铁律条 */}
          <div className="mx-4 md:mx-0 mt-3 flex items-center gap-2 text-[10px] text-gray-500 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
            <span>🛡️ 专业优先</span>
            <span className="text-gray-300">·</span>
            <span>🚧 阶段隔离</span>
            <span className="text-gray-300">·</span>
            <span>💙 正向引导</span>
            {!feed.backend && feed.badges && feed.badges.length > 0 && (
              <span className="ml-auto text-amber-500">已得徽章 {feed.badges.join("")}</span>
            )}
            {feed.backend && (
              <span className="ml-auto text-emerald-500">☁️ 云端真实数据</span>
            )}
          </div>

          {/* 搜索 */}
          <div className="mx-4 md:mx-0 mt-3">
            <div className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2.5 shadow-sm border border-gray-100">
              <span className="text-gray-400">🔍</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索康复经验、话题或家长…"
                className="flex-1 text-sm outline-none bg-transparent text-gray-700"
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-gray-300 text-xs">✕</button>
              )}
            </div>
          </div>

          {/* 频道筛选 */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 px-4 md:px-0 pb-1">
            {CHANNELS.map((c) => {
              const active = channel === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setChannel(c.id)}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-95 ${
                    active ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-500 border-gray-200"
                  }`}
                >
                  {c.icon} {c.label}
                </button>
              );
            })}
          </div>

          {/* 只看同阶段 */}
          <div className="flex items-center justify-between px-4 md:px-0 mt-2 mb-1">
            <span className="text-[11px] text-gray-400">
              {channel === "recommend" ? "为你推荐 · 按互动与阶段匹配排序" : `「${CHANNELS.find((c) => c.id === channel)?.label}」`}
            </span>
            <button
              onClick={() => setSameStage((v) => !v)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                sameStage ? "bg-indigo-50 text-indigo-600 border-indigo-200" : "text-gray-400 border-gray-200"
              }`}
            >
              {sameStage ? "✓ 只看同阶段" : "只看同阶段"}
            </button>
          </div>
        </div>

        {/* 信息流 */}
        <div className="px-4 md:px-6 mt-1">
          {loading ? (
            <div className="text-center py-16 text-sm text-gray-300">加载中…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-4xl block mb-2">🌱</span>
              <p className="text-sm text-gray-400">这里还没有内容，<br />点击右下角 ➕ 分享第一条吧</p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {filtered.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  liked={!!feed.liked[post.id]}
                  favorited={!!feed.favorited[post.id]}
                  onOpen={setDetailId}
                  onLike={onLike}
                  onFavorite={onFavorite}
                  onShare={onShare}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* 悬浮发布按钮 */}
      <button
        onClick={() => setPublishOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-indigo-500 text-white text-2xl shadow-lg flex items-center justify-center active:scale-90"
        style={{ boxShadow: "0 8px 24px rgba(99,102,241,0.45)" }}
        aria-label="发布"
      >
        ＋
      </button>

      <BottomNav activeTab="community" onTabChange={handleTabChange} tabs={bottomTabs} />

      <PostDetail
        post={detailPost}
        liked={detailPost ? !!feed.liked[detailPost.id] : false}
        favorited={detailPost ? !!feed.favorited[detailPost.id] : false}
        onClose={() => setDetailId(null)}
        onLike={onLike}
        onFavorite={onFavorite}
        onAddComment={onAddComment}
      />

      <PublishModal open={publishOpen} onClose={() => setPublishOpen(false)} onPublish={onPublish} todayTask={todayTask} />

      {/* 提示 toast */}
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
