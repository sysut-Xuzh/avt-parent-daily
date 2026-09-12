// ===== 康复圈后端服务层 =====
// 真实用户数据走 Supabase（posts/comments/likes/collects）；
// 未登录（游客 / 体验模式 / 表格尚未建好）时优雅降级回本地 mock，保证页面永不错白屏。
//
// 后端模式仅在「已登录」时激活：登录用户发帖/评论/点赞会持久化到共享数据库，
// 其他真实用户也能看到 —— 这正是「介入真实用户」的关键。
"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase";
import type { LearningStageId } from "@/data/learning";
import {
  CURRENT_STAGE,
  CURRENT_STAGE_LABEL,
  computeScore,
  loadState,
  buildFeed,
  saveState,
  toggleLike as localToggleLike,
  toggleFavorite as localToggleFavorite,
  addComment as localAddComment,
  publishPost as localPublishPost,
  loadParentProfile,
  resolveDisplayName,
  loadCommunityDatesFromStorage,
  SEED_POSTS,
  type Post,
  type Comment,
  type MediaItem,
  type PostType,
  type ChannelId,
  type PublishInput,
  type CommunityState,
} from "@/data/community";

// ---------- 返回结构 ----------
export interface FeedResult {
  posts: Post[];
  liked: Record<string, boolean>;
  favorited: Record<string, boolean>;
  backend: boolean; // true=真实后端，false=本地降级
  points?: number; // 仅本地降级分支有值
  badges?: string[]; // 仅本地降级分支有值
}

export interface ProfileStats {
  publishCount: number;
  likeReceived: number;
  collectCount: number;
  commentCount: number;
  likeGiven: number;
}

export interface ProfileView {
  stats: ProfileStats;
  myPosts: Post[];
  myComments: { post: Post; comment: Comment }[];
  likedPosts: Post[];
  favPosts: Post[];
  backend: boolean;
  points: number;
  badges: string[];
  liked: Record<string, boolean>;
  favorited: Record<string, boolean>;
}

// ---------- Supabase 客户端安全获取 ----------
function getSupabaseBrowserSafe(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  try {
    return getSupabaseBrowser();
  } catch {
    return null;
  }
}

// ---------- 当前用户角色（修复：治疗师评论被误写为家长身份） ----------
// 登录时写入 localStorage.avt_role（见 login/page.tsx），也同步到 user.user_metadata.role。
function getCurrentRole(): "parent" | "therapist" {
  if (typeof window === "undefined") return "parent";
  try {
    const r = localStorage.getItem("avt_role");
    if (r === "therapist" || r === "parent") return r;
  } catch {
    /* ignore */
  }
  return "parent";
}

// 治疗师展示名：优先本地覆盖（未来可接治疗师档案），默认与种子治疗师一致。
function getTherapistDisplayName(): string {
  if (typeof window === "undefined") return "陈治疗师";
  try {
    const n = localStorage.getItem("avt_therapist_name");
    if (n) return n;
  } catch {
    /* ignore */
  }
  return "陈治疗师";
}

// ---------- 时间工具（仅客户端调用，避免 SSR 水合差异） ----------
function relativeTime(dateStr: string): { time: string; ageHours: number } {
  const created = new Date(dateStr).getTime();
  const diffMs = Date.now() - created;
  const h = Math.max(0, diffMs / 3_600_000);
  let time: string;
  if (h < 1) time = "刚刚";
  else if (h < 24) time = `${Math.floor(h)}小时前`;
  else if (h < 48) time = "昨天";
  else if (h < 168) time = `${Math.floor(h / 24)}天前`;
  else time = `${Math.floor(h / 168)}周前`;
  return { time, ageHours: h };
}

// ---------- 行 → Post 映射 ----------
function rowToPost(
  row: any,
  rawComments: any[],
  liked: boolean,
  favorited: boolean
): Post {
  const { time, ageHours } = relativeTime(row.created_at);
  const media: MediaItem[] = Array.isArray(row.media)
    ? row.media.map((m: any) => ({
        kind: m.kind === "video" ? "video" : "image",
        caption: m.caption || "",
        gradient: m.gradient || "linear-gradient(135deg,#e0e7ff,#c7d2fe)",
        duration: m.duration,
      }))
    : [];
  const comments: Comment[] = (rawComments || []).map((c: any) => {
    const ct = relativeTime(c.created_at);
    return {
      id: c.id,
      authorName: c.author_name,
      avatar: c.author_avatar || "🙂",
      role: c.author_role || "parent",
      verified: !!c.author_verified,
      content: c.content,
      time: ct.time,
      isProReply: !!c.is_therapist_reply,
    };
  });
  return {
    id: row.id,
    type: row.type,
    channel: row.channel,
    author: {
      name: row.author_name,
      avatar: row.author_avatar || "🙂",
      role: row.author_role || "parent",
      org: row.author_org || undefined,
      verified: !!row.author_verified,
      stage: (row.stage_tag as LearningStageId) || "adapt",
      stageLabel: row.author_stage_label || "",
    },
    time,
    ageHours,
    text: row.content,
    media,
    tags: row.tags || [],
    likes: row.like_count || 0,
    comments,
    favorites: row.favorite_count || 0,
    shares: row.share_count || 0,
    therapistReply: row.therapist_reply || undefined,
    practiced: !!row.related_task,
    negative: !!row.is_negative,
    relatedTask: row.related_task || undefined,
  };
}

function profilePostFromRow(row: any): Post {
  return rowToPost(row, [], false, false);
}

// ---------- 本地降级 ----------
function localFeedResult(): FeedResult {
  const state = loadState();
  const posts = buildFeed(state, CURRENT_STAGE);
  return {
    posts,
    liked: { ...state.liked },
    favorited: { ...state.favorited },
    backend: false,
    points: state.points,
    badges: state.badges,
  };
}

function localFeedFromState(state: CommunityState): FeedResult {
  const posts = buildFeed(state, CURRENT_STAGE);
  return {
    posts,
    liked: { ...state.liked },
    favorited: { ...state.favorited },
    backend: false,
    points: state.points,
    badges: state.badges,
  };
}

// ---------- 信息流（首页） ----------
export async function getFeed(): Promise<FeedResult> {
  const supabase = getSupabaseBrowserSafe();
  if (!supabase) return localFeedResult();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return localFeedResult(); // 未登录 → 本地 demo

    const { data: posts, error } = await supabase
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (error || !posts) return localFeedResult();

    const ids = posts.map((p) => p.id);
    const { data: comments } = await supabase
      .from("comments")
      .select("*")
      .in("post_id", ids.length ? ids : ["__none__"])
      .order("created_at", { ascending: true });

    const byPost: Record<string, any[]> = {};
    (comments || []).forEach((c: any) => {
      (byPost[c.post_id] ||= []).push(c);
    });

    const [{ data: lk }, { data: cl }] = await Promise.all([
      supabase.from("likes").select("post_id").eq("user_id", user.id),
      supabase.from("collects").select("post_id").eq("user_id", user.id),
    ]);
    const liked: Record<string, boolean> = {};
    const favorited: Record<string, boolean> = {};
    (lk || []).forEach((r: any) => (liked[r.post_id] = true));
    (cl || []).forEach((r: any) => (favorited[r.post_id] = true));

    const mapped = posts.map((p: any) =>
      rowToPost(p, byPost[p.id] || [], !!liked[p.id], !!favorited[p.id])
    );
    // 复用现有排序算法（时间衰减 + 互动 + 阶段匹配）
    mapped.sort((a: Post, b: Post) => computeScore(b, CURRENT_STAGE) - computeScore(a, CURRENT_STAGE));

    return { posts: mapped, liked, favorited, backend: true };
  } catch {
    return localFeedResult();
  }
}

// ---------- 点赞 ----------
export async function toggleLike(postId: string, liked: boolean): Promise<FeedResult> {
  const supabase = getSupabaseBrowserSafe();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (supabase && user) {
    try {
      if (liked) {
        await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("likes").insert({ post_id: postId, user_id: user.id });
      }
      return await getFeed();
    } catch {
      return await getFeed();
    }
  }
  const state = loadState();
  return localFeedFromState(localToggleLike(state, postId));
}

// ---------- 收藏 ----------
export async function toggleFavorite(postId: string, favorited: boolean): Promise<FeedResult> {
  const supabase = getSupabaseBrowserSafe();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (supabase && user) {
    try {
      if (favorited) {
        await supabase.from("collects").delete().eq("post_id", postId).eq("user_id", user.id);
      } else {
        await supabase.from("collects").insert({ post_id: postId, user_id: user.id });
      }
      return await getFeed();
    } catch {
      return await getFeed();
    }
  }
  const state = loadState();
  return localFeedFromState(localToggleFavorite(state, postId));
}

// ---------- 评论 ----------
export async function addComment(postId: string, text: string): Promise<FeedResult> {
  const supabase = getSupabaseBrowserSafe();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (supabase && user) {
    try {
      const profile = loadParentProfile();
      const isTherapist = getCurrentRole() === "therapist";
      await supabase.from("comments").insert({
        post_id: postId,
        user_id: user.id,
        content: text,
        author_name: isTherapist ? getTherapistDisplayName() : resolveDisplayName(profile),
        author_avatar: isTherapist ? "🩺" : (profile.avatar || "🙂"),
        author_role: isTherapist ? "therapist" : "parent",
        author_verified: isTherapist,
        is_therapist_reply: isTherapist,
      });
      return await getFeed();
    } catch {
      return await getFeed();
    }
  }
  const state = loadState();
  return localFeedFromState(localAddComment(state, postId, text));
}

// ---------- 发布 ----------
export async function createPost(input: PublishInput): Promise<FeedResult> {
  const supabase = getSupabaseBrowserSafe();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (supabase && user) {
    try {
      const profile = loadParentProfile();
      const media: MediaItem[] = [];
      if (input.format === "video") {
        media.push({ kind: "video", caption: "短视频封面", gradient: "linear-gradient(135deg,#c7d2fe,#a5b4fc)", duration: "00:15" });
      } else {
        for (let i = 0; i < input.mediaCount; i++) {
          media.push({ kind: "image", caption: `图片${i + 1}`, gradient: "linear-gradient(135deg,#bfdbfe,#a5b4fc)" });
        }
      }
      // 本地敏感词兜底（真正的审核后续接阿里云绿网）
      const NEGATIVE_WORDS = ["崩溃", "想放弃", "活不下去", "撑不下去", "不想活", "绝望"];
      const isNegative = NEGATIVE_WORDS.some((w) => input.text.includes(w));
      const isTherapist = getCurrentRole() === "therapist";
      await supabase.from("posts").insert({
        user_id: user.id,
        type: input.type,
        channel: input.channel,
        content: input.text,
        media,
        tags: input.tags,
        stage_tag: CURRENT_STAGE,
        author_name: isTherapist ? getTherapistDisplayName() : resolveDisplayName(profile),
        author_avatar: isTherapist ? "🩺" : (profile.avatar || "🙂"),
        author_role: isTherapist ? "therapist" : "parent",
        author_verified: isTherapist,
        author_stage_label: CURRENT_STAGE_LABEL,
        is_negative: isNegative,
        related_task: input.relatedTask || null,
        status: "published",
      });
      return await getFeed();
    } catch {
      return await getFeed();
    }
  }
  const state = loadState();
  const { state: next } = localPublishPost(state, input);
  saveState(next);
  return localFeedFromState(next);
}

// ---------- 个人主页 ----------
export async function getProfileView(): Promise<ProfileView> {
  const supabase = getSupabaseBrowserSafe();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  if (supabase && user) {
    try {
      const userId = user.id;
      const [
        { data: posts },
        { data: comments },
        { data: lk },
        { data: cl },
      ] = await Promise.all([
        supabase.from("posts").select("*").eq("user_id", userId).eq("status", "published").order("created_at", { ascending: false }),
        supabase
          .from("comments")
          .select("*, posts(id, content, type, author_name, author_avatar, channel, stage_tag, author_stage_label)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("likes").select("post_id").eq("user_id", userId),
        supabase.from("collects").select("post_id").eq("user_id", userId),
      ]);

      const myPosts: Post[] = (posts || []).map((p: any) => profilePostFromRow(p));
      const likedIds = (lk || []).map((r: any) => r.post_id);
      const favIds = (cl || []).map((r: any) => r.post_id);

      // 我点赞/收藏的帖：批量取回帖子
      let likedPosts: Post[] = [];
      let favPosts: Post[] = [];
      if (likedIds.length) {
        const { data: lp } = await supabase.from("posts").select("*").in("id", likedIds);
        likedPosts = (lp || []).map((p: any) => profilePostFromRow(p));
      }
      if (favIds.length) {
        const { data: fp } = await supabase.from("posts").select("*").in("id", favIds);
        favPosts = (fp || []).map((p: any) => profilePostFromRow(p));
      }

      // 我的评论：取涉及的帖子
      const commentPostIds = (comments || [])
        .map((c: any) => c.posts?.id)
        .filter(Boolean);
      let commentPosts: Record<string, Post> = {};
      if (commentPostIds.length) {
        const { data: cps } = await supabase.from("posts").select("*").in("id", commentPostIds);
        (cps || []).forEach((p: any) => (commentPosts[p.id] = profilePostFromRow(p)));
      }
      const myComments = (comments || [])
        .filter((c: any) => c.posts?.id && commentPosts[c.posts.id])
        .map((c: any) => {
          const ct = relativeTime(c.created_at);
          const comment: Comment = {
            id: c.id,
            authorName: c.author_name,
            avatar: c.author_avatar || "🙂",
            role: c.author_role || "parent",
            verified: !!c.author_verified,
            content: c.content,
            time: ct.time,
            isProReply: !!c.is_therapist_reply,
          };
          return { post: commentPosts[c.posts.id], comment };
        });

      const likeReceived = myPosts.reduce((s, p) => s + p.likes, 0);
      const stats: ProfileStats = {
        publishCount: myPosts.length,
        likeReceived,
        collectCount: favPosts.length,
        commentCount: myComments.length,
        likeGiven: likedPosts.length,
      };
      const likedMap: Record<string, boolean> = {};
      const favMap: Record<string, boolean> = {};
      likedIds.forEach((id: string) => (likedMap[id] = true));
      favIds.forEach((id: string) => (favMap[id] = true));
      return {
        stats,
        myPosts,
        myComments,
        likedPosts,
        favPosts,
        backend: true,
        points: 0,
        badges: [],
        liked: likedMap,
        favorited: favMap,
      };
    } catch {
      // 落回本地
    }
  }

  // 本地降级
  const state = loadState();
  const all = [...state.userPosts, ...SEED_POSTS];
  // 本地模式下“我的发布”即 state.userPosts（本机发布的帖），直接取用，
  // 不再按作者名字符串匹配，避免昵称变更 / 初始化时序导致主页漏显、但信息流仍可见的不一致。
  const mine = [...state.userPosts, ...SEED_POSTS.filter((p: Post) => p.id === "p-1")];
  const likeReceived = mine.reduce((s: number, p: Post) => s + p.likes + (state.liked[p.id] ? 1 : 0), 0);
  const collectCount = Object.keys(state.favorited).length;
  const commentCount = Object.values(state.comments).reduce((s: number, arr: Comment[]) => s + arr.length, 0);
  const likeGiven = Object.keys(state.liked).length;
  const myComments: { post: Post; comment: Comment }[] = [];
  for (const [postId, list] of Object.entries(state.comments)) {
    const post = all.find((p: Post) => p.id === postId);
    if (!post) continue;
    for (const c of list) myComments.push({ post, comment: c });
  }
  const likedPosts = all.filter((p: Post) => state.liked[p.id]).map(overlayLocal);
  const favPosts = all.filter((p: Post) => state.favorited[p.id]).map(overlayLocal);
  return {
    stats: { publishCount: mine.length, likeReceived, collectCount, commentCount, likeGiven },
    myPosts: mine.map(overlayLocal),
    myComments: myComments.reverse(),
    likedPosts,
    favPosts,
    backend: false,
    points: state.points,
    badges: state.badges,
    liked: { ...state.liked },
    favorited: { ...state.favorited },
  };
}

function overlayLocal(p: Post): Post {
  return p;
}

// ---------- 成长日历：社区分享日 ----------
export async function getMyPostDates(): Promise<Set<string>> {
  const supabase = getSupabaseBrowserSafe();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  if (supabase && user) {
    try {
      const { data } = await supabase
        .from("posts")
        .select("created_at")
        .eq("user_id", user.id)
        .eq("status", "published");
      const set = new Set<string>();
      (data || []).forEach((r: any) => {
        const d = new Date(r.created_at);
        set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
      });
      return set;
    } catch {
      return new Set(loadCommunityDatesFromStorage());
    }
  }
  return new Set(loadCommunityDatesFromStorage());
}

// 对外暴露类型别名，方便页面引用
export type { Post, Comment, MediaItem, PostType, ChannelId, PublishInput, CommunityState };
