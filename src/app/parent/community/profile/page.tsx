"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import BottomNav from "@/components/bottom-nav";
import { bottomTabs } from "@/data/mock-data";
import type { TabId } from "@/types";
import {
  CURRENT_USER,
  CURRENT_USER_LOCATION,
  CURRENT_STAGE_LABEL,
  PARENT_PROFILE,
  loadParentProfile,
  saveParentProfile,
  resolveDisplayName,
  type ParentProfile,
  type Post,
  type PostType,
} from "@/data/community";
import {
  getProfileView,
  toggleLike,
  toggleFavorite,
  addComment,
  type ProfileView,
} from "@/lib/community-service";
import PostDetail from "@/components/community/post-detail";
import ProfileEditModal from "@/components/profile-edit-modal";

const EMPTY_VIEW: ProfileView = {
  stats: { publishCount: 0, likeReceived: 0, collectCount: 0, commentCount: 0, likeGiven: 0 },
  myPosts: [],
  myComments: [],
  likedPosts: [],
  favPosts: [],
  backend: false,
  points: 0,
  badges: [],
  liked: {},
  favorited: {},
};

// 无封面帖按类型给一个渐变背景（小红书式竖封面）
const TYPE_GRAD: Record<PostType, string> = {
  checkin: "linear-gradient(135deg,#a7f3d0,#6ee7b7)",
  experience: "linear-gradient(135deg,#fbcfe8,#f9a8d4)",
  therapist: "linear-gradient(135deg,#bfdbfe,#a5b4fc)",
  qa: "linear-gradient(135deg,#ddd6fe,#c4b5fd)",
  system: "linear-gradient(135deg,#fecdd3,#fda4af)",
};
const TYPE_ICON: Record<PostType, string> = {
  checkin: "📅",
  experience: "💡",
  therapist: "🩺",
  qa: "❓",
  system: "🎈",
};

type MainTab = "posts" | "comments" | "likes";
type LikeSub = "liked" | "favorited";

export default function CommunityProfilePage() {
  const router = useRouter();
  const [view, setView] = useState<ProfileView>(EMPTY_VIEW);
  const [profile, setProfile] = useState<ParentProfile>(PARENT_PROFILE);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState<MainTab>("posts");
  const [likeSub, setLikeSub] = useState<LikeSub>("liked");
  const [detailId, setDetailId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getProfileView()
      .then(setView)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setProfile(loadParentProfile());
    refresh();
  }, [refresh]);

  const handleSaveProfile = (p: ParentProfile) => {
    setProfile(p);
    saveParentProfile(p);
  };

  const stats = view.stats;
  const myPosts = view.myPosts;
  const myComments = view.myComments;
  const likedPosts = view.likedPosts;
  const favPosts = view.favPosts;

  // 所有帖合集（用于详情反查）
  const allById = useMemo(() => {
    const m = new Map<string, Post>();
    [...myPosts, ...likedPosts, ...favPosts, ...myComments.map((r) => r.post)].forEach((p) => m.set(p.id, p));
    return m;
  }, [myPosts, likedPosts, favPosts, myComments]);

  const detailPost = useMemo<Post | null>(
    () => (detailId ? allById.get(detailId) || null : null),
    [detailId, allById]
  );

  const handleTabChange = (tab: TabId) => {
    if (tab === "profile") router.push("/parent/settings");
    else if (tab === "hearing") router.push("/parent/hearing-test");
    else if (tab === "learning") router.push("/parent/daily-learning");
    else if (tab === "tasks") router.push("/parent");
    else if (tab === "community") router.push("/parent/community");
  };

  const onLike = useCallback(
    async (id: string) => {
      await toggleLike(id, !!view.liked[id]);
      refresh();
    },
    [view.liked, refresh]
  );
  const onFavorite = useCallback(
    async (id: string) => {
      await toggleFavorite(id, !!view.favorited[id]);
      refresh();
    },
    [view.favorited, refresh]
  );
  const onAddComment = useCallback(
    async (id: string, text: string) => {
      await addComment(id, text);
      refresh();
    },
    [refresh]
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 md:bg-transparent">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="md:px-6 pt-2">
          {/* 顶栏 */}
          <div className="flex items-center px-4 md:px-0 pt-3">
            <button
              onClick={() => router.push("/parent/community")}
              className="w-9 h-9 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-500 text-lg active:scale-90"
              aria-label="返回"
            >
              ←
            </button>
            <h1 className="flex-1 text-center text-base font-extrabold text-gray-800 -ml-9">个人主页</h1>
            <span className="w-9" />
          </div>

          {/* 个人信息块 */}
          <div className="flex items-center gap-4 px-4 md:px-0 mt-4">
            <button
              onClick={() => setEditOpen(true)}
              className="relative w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center text-4xl flex-shrink-0 shadow-sm border border-indigo-100 active:scale-95 transition-transform"
              aria-label="编辑资料"
            >
              {profile.avatar || CURRENT_USER.avatar}
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center text-[11px]">
                ✏️
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-gray-800 truncate">{resolveDisplayName(profile)}</h2>
                <button
                  onClick={() => setEditOpen(true)}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium active:scale-95"
                >
                  编辑
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">{CURRENT_STAGE_LABEL}</p>
              <p className="text-xs text-gray-400 mt-0.5">📍 {(profile.city || CURRENT_USER_LOCATION).replace(/市$/, "")}</p>
              {profile.bio ? (
                <p className="text-xs text-gray-400 mt-1 truncate">✍️ {profile.bio}</p>
              ) : null}
              <button
                onClick={() => router.push("/parent/consult")}
                className="mt-2 text-[11px] px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium active:scale-95"
              >
                💬 问治疗师
              </button>
            </div>
          </div>

          {/* 三统计卡 */}
          <div className="grid grid-cols-3 gap-2 mt-5 px-4 md:px-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-3 text-center">
              <p className="text-xl font-extrabold text-gray-800">{stats.publishCount}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">发布</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-3 text-center">
              <p className="text-xl font-extrabold text-rose-500">{stats.likeReceived}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">获赞</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 py-3 text-center">
              <p className="text-xl font-extrabold text-amber-500">{stats.collectCount}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">收藏</p>
            </div>
          </div>

          {/* 主 Tab */}
          <div className="flex gap-1 mt-5 px-4 md:px-0 bg-white/0">
            {([
              { id: "posts", label: "我的发布" },
              { id: "comments", label: "我的评论" },
              { id: "likes", label: "点赞·收藏" },
            ] as { id: MainTab; label: string }[]).map((t) => {
              const active = mainTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setMainTab(t.id)}
                  className={`flex-1 text-center py-2 text-sm font-medium border-b-2 transition-all ${
                    active
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-400"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* 内容区 */}
          <div className="px-4 md:px-6 mt-3">
            {loading ? (
              <div className="text-center py-16 text-sm text-gray-300">加载中…</div>
            ) : mainTab === "posts" ? (
              <PostGrid
                posts={myPosts}
                emptyText="还没有发布过内容，去康复圈分享你的康复日记吧"
                onOpen={setDetailId}
              />
            ) : mainTab === "comments" ? (
              <CommentList comments={myComments} onOpen={setDetailId} />
            ) : (
              <div>
                {/* 二级 Tab */}
                <div className="flex gap-2 mb-3">
                  {([
                    { id: "liked", label: "我点赞的" },
                    { id: "favorited", label: "我收藏的" },
                  ] as { id: LikeSub; label: string }[]).map((s) => {
                    const active = likeSub === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setLikeSub(s.id)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all active:scale-95 ${
                          active ? "bg-indigo-500 text-white border-indigo-500" : "bg-white text-gray-500 border-gray-200"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
                {likeSub === "liked" ? (
                  <PostGrid
                    posts={likedPosts}
                    emptyText="还没有点赞过内容，看到好经验记得点个赞哦"
                    onOpen={setDetailId}
                  />
                ) : (
                  <PostGrid
                    posts={favPosts}
                    emptyText="还没有收藏内容，看到好文章记得收藏哦"
                    onOpen={setDetailId}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav activeTab="community" onTabChange={handleTabChange} tabs={bottomTabs} />

      <PostDetail
        post={detailPost}
        liked={detailPost ? !!view.liked[detailPost.id] : false}
        favorited={detailPost ? !!view.favorited[detailPost.id] : false}
        onClose={() => setDetailId(null)}
        onLike={onLike}
        onFavorite={onFavorite}
        onAddComment={onAddComment}
      />

      <ProfileEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onSave={handleSaveProfile}
      />
    </div>
  );
}

// ---------- 2 列网格封面卡 ----------
function PostGrid({ posts, emptyText, onOpen }: { posts: Post[]; emptyText: string; onOpen: (id: string) => void }) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-4xl block mb-2">🌱</span>
        <p className="text-sm text-gray-400">{emptyText}</p>
      </div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-2.5">
      {posts.map((post) => {
        const cover = post.media.length > 0 ? post.media[0].gradient : TYPE_GRAD[post.type];
        const title = post.text.replace(/\n/g, " ").slice(0, 26);
        return (
          <button
            key={post.id}
            onClick={() => onOpen(post.id)}
            className="text-left active:scale-95 transition-transform"
          >
            <div
              className="relative rounded-2xl overflow-hidden shadow-sm border border-gray-100"
              style={{ background: cover, aspectRatio: "3/4" }}
            >
              <span className="absolute top-2 left-2 text-base">{TYPE_ICON[post.type]}</span>
              {post.practiced && (
                <span className="absolute top-2 right-2 text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                  ✅ 已实践
                </span>
              )}
              {/* 底部标题遮罩 */}
              <div
                className="absolute bottom-0 left-0 right-0 p-2"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45), rgba(0,0,0,0))" }}
              >
                <p className="text-white text-[11px] font-medium leading-snug line-clamp-2">{title}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1.5 px-0.5">
              <span className="text-[11px] text-gray-500 truncate">{post.author.name}</span>
              <span className="text-[11px] text-gray-400 flex items-center gap-0.5 flex-shrink-0">
                ❤️ {post.likes}
              </span>
            </div>
          </button>
        );
      })}
    </motion.div>
  );
}

// ---------- 我的评论列表 ----------
function CommentList({
  comments,
  onOpen,
}: {
  comments: { post: Post; comment: { id: string; content: string; time: string } }[];
  onOpen: (id: string) => void;
}) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-4xl block mb-2">💬</span>
        <p className="text-sm text-gray-400">还没有评论过，去和其他家长交流吧</p>
      </div>
    );
  }
  return (
    <div className="space-y-2.5">
      {comments.map(({ post, comment }) => (
        <button
          key={comment.id}
          onClick={() => onOpen(post.id)}
          className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 p-3 active:scale-95 transition-transform"
        >
          <p className="text-[11px] text-gray-400">
            我在 <span className="text-indigo-500 font-medium">{post.author.name}</span> 的帖子下评论
          </p>
          <p className="text-sm text-gray-700 mt-1 leading-relaxed">{comment.content}</p>
          <div className="mt-2 pt-2 border-t border-gray-50 flex items-center gap-1.5">
            <span className="text-base">{TYPE_ICON[post.type]}</span>
            <p className="text-[11px] text-gray-400 truncate">原帖：{post.text.replace(/\n/g, " ").slice(0, 30)}…</p>
          </div>
        </button>
      ))}
    </div>
  );
}
