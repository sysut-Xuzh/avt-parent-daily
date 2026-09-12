// ===== 康复圈（轻量小红书式家长社区）数据层 =====
// 纯前端原型：种子内容 + localStorage 交互存档，无后端。
import type { LearningStageId } from "@/data/learning";

// ---------- 类型 ----------
export type PostType = "checkin" | "experience" | "therapist" | "qa" | "system";
export type ChannelId =
  | "recommend"
  | "checkin"
  | "device"
  | "mood"
  | "integrate"
  | "qa";

export type AuthorRole = "parent" | "therapist" | "platform";

export interface PostAuthor {
  name: string;
  avatar: string; // emoji 头像
  role: AuthorRole;
  org?: string; // 治疗师机构
  verified: boolean; // 蓝标认证
  stage: LearningStageId;
  stageLabel: string;
}

export interface Comment {
  id: string;
  authorName: string;
  avatar: string;
  role: AuthorRole;
  verified?: boolean;
  content: string;
  time: string; // 展示用相对时间字符串
  isProReply?: boolean; // 治疗师专业回复（置顶）
}

export interface MediaItem {
  kind: "image" | "video";
  caption: string;
  gradient: string; // CSS 渐变
  duration?: string; // 视频时长
}

export interface Post {
  id: string;
  type: PostType;
  channel: Exclude<ChannelId, "recommend">; // 推荐为聚合，不单独归属
  author: PostAuthor;
  time: string; // 展示用
  ageHours: number; // 用于时间衰减（确定性，避免渲染期使用 Date）
  text: string;
  media: MediaItem[];
  tags: string[];
  likes: number;
  comments: Comment[];
  favorites: number;
  shares: number;
  therapistReply?: string; // 治疗师回复摘要
  practiced?: boolean; // 「已实践」徽章（学与练联动）
  negative?: boolean; // 负面情绪 → 触发心理支持卡
  relatedTask?: string; // 关联训练任务
}

// ---------- 频道 ----------
export interface Channel {
  id: ChannelId;
  label: string;
  icon: string;
  color: string; // tailwind 文字色类
  dot: string; // 选中态小圆点背景
}

export const CHANNELS: Channel[] = [
  { id: "recommend", label: "推荐", icon: "🔥", color: "text-rose-500", dot: "bg-rose-500" },
  { id: "checkin", label: "训练打卡", icon: "📅", color: "text-emerald-500", dot: "bg-emerald-500" },
  { id: "device", label: "设备养护", icon: "🛠️", color: "text-sky-500", dot: "bg-sky-500" },
  { id: "mood", label: "心情树洞", icon: "💬", color: "text-violet-500", dot: "bg-violet-500" },
  { id: "integrate", label: "融合准备", icon: "🤝", color: "text-amber-500", dot: "bg-amber-500" },
  { id: "qa", label: "问答广场", icon: "❓", color: "text-indigo-500", dot: "bg-indigo-500" },
];

// 当前用户（演示）所处的康复阶段：适应期
export const CURRENT_STAGE: LearningStageId = "adapt";
export const CURRENT_STAGE_LABEL = "术后6个月 · 适应期";

// 当前家长完整档案：我的设置 + 个人主页 + 康复圈联动的统一数据源
export interface ParentProfile {
  nickname: string; // 昵称（康复圈显示用）
  avatar: string; // emoji 头像
  phone: string; // 已脱敏手机号 138****5678
  city: string; // 所在城市
  bio: string; // 个性签名
  role: "primary" | "secondary"; // 主要 / 次要照护人
}

export const PARENT_PROFILE: ParentProfile = {
  nickname: "张妈妈",
  avatar: "🐰",
  phone: "138****5678",
  city: "北京市",
  bio: "每天进步一点点 🌱",
  role: "primary",
};

// 当前登录家长（个人中心主人公 / 社区作者）——与种子帖 p-1 的「张妈妈」为同一账号。
// 使用 let + 实时绑定，保存档案后可同步更新，保证社区昵称联动。
export let CURRENT_USER: PostAuthor = {
  name: PARENT_PROFILE.nickname,
  avatar: PARENT_PROFILE.avatar,
  role: "parent",
  verified: false,
  stage: CURRENT_STAGE,
  stageLabel: CURRENT_STAGE_LABEL,
};
export const CURRENT_USER_LOCATION = PARENT_PROFILE.city.replace(/市$/, "");

// 家长档案 localStorage 持久化（我的设置页读写，个人主页 / 社区联动读取）
const PARENT_PROFILE_KEY = "avt_parent_profile";

export function loadParentProfile(): ParentProfile {
  if (typeof window === "undefined") return PARENT_PROFILE;
  try {
    const raw = window.localStorage.getItem(PARENT_PROFILE_KEY);
    if (!raw) return PARENT_PROFILE;
    return { ...PARENT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return PARENT_PROFILE;
  }
}

// 默认昵称规则（P1）：未设置昵称时显示「XX妈妈」（XX 为宝宝名）
export function getDefaultNickname(): string {
  let babyName = "宝宝";
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("avt_baby_info");
      if (raw) babyName = JSON.parse(raw).name || "宝宝";
    } catch {
      /* ignore */
    }
  }
  return `${babyName}妈妈`;
}

// 对外展示用昵称：昵称为空时回退默认规则
export function resolveDisplayName(p: ParentProfile): string {
  const n = p.nickname.trim();
  return n.length > 0 ? n : getDefaultNickname();
}

export function saveParentProfile(p: ParentProfile): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PARENT_PROFILE_KEY, JSON.stringify(p));
  applyParentProfile(p);
}

// 把最新档案同步到社区当前用户（昵称 / 头像联动），避免刷新前不一致
export function applyParentProfile(p: ParentProfile): void {
  const name = resolveDisplayName(p);
  CURRENT_USER = { ...CURRENT_USER, name, avatar: p.avatar || PARENT_PROFILE.avatar };
  const mine = SEED_POSTS.find((x) => x.id === "p-1");
  if (mine) mine.author = { ...mine.author, name, avatar: p.avatar || PARENT_PROFILE.avatar };
}

// 阶段相邻关系（用于匹配分）
const STAGE_ORDER: LearningStageId[] = ["initial", "adapt", "improve", "integrate"];

// ---------- 种子数据 ----------
// 复用项目阶段色板
const G = {
  pink: "linear-gradient(135deg,#fbcfe8,#f9a8d4)",
  blue: "linear-gradient(135deg,#bfdbfe,#a5b4fc)",
  sky: "linear-gradient(135deg,#bae6fd,#7dd3fc)",
  violet: "linear-gradient(135deg,#ddd6fe,#c4b5fd)",
  amber: "linear-gradient(135deg,#fde68a,#fcd34d)",
  emerald: "linear-gradient(135deg,#a7f3d0,#6ee7b7)",
  rose: "linear-gradient(135deg,#fecdd3,#fda4af)",
  indigo: "linear-gradient(135deg,#c7d2fe,#a5b4fc)",
};

export const SEED_POSTS: Post[] = [
  {
    id: "p-1",
    type: "checkin",
    channel: "checkin",
    author: {
      name: "张妈妈",
      avatar: "🐰",
      role: "parent",
      verified: false,
      stage: "adapt",
      stageLabel: "术后6个月 · 适应期",
    },
    time: "2小时前",
    ageHours: 2,
    text: "今天练习「动物叫声辨识」，宝宝第一次主动指向了小狗的卡片！🎉 之前一直没反应，今天突然就对了，眼泪都要出来了。坚持真的有用。",
    media: [
      { kind: "image", caption: "训练现场", gradient: G.pink },
      { kind: "image", caption: "卡片展示", gradient: G.blue },
    ],
    tags: ["今日训练打卡", "术后6个月", "动物叫声"],
    likes: 23,
    comments: [
      {
        id: "c-1",
        authorName: "李治疗师",
        avatar: "🩺",
        role: "therapist",
        verified: true,
        content: "太棒了！主动指向说明孩子已经建立了「声音—意义」的联结，这是辨听的重要一步。建议接下来加入「指认+命名」组合，巩固得更快。",
        time: "1小时前",
        isProReply: true,
      },
      { id: "c-2", authorName: "刘妈妈", avatar: "🐱", role: "parent", content: "同款感动！我们一起加油💪", time: "40分钟前" },
    ],
    favorites: 5,
    shares: 2,
    therapistReply: "李治疗师：主动指向说明已建立声音—意义联结，建议加入「指认+命名」。",
    practiced: true,
    relatedTask: "动物叫声辨识",
  },
  {
    id: "p-2",
    type: "therapist",
    channel: "device",
    author: {
      name: "李治疗师",
      avatar: "🩺",
      role: "therapist",
      org: "听语康复中心",
      verified: true,
      stage: "adapt",
      stageLabel: "认证专家",
    },
    time: "5小时前",
    ageHours: 5,
    text: "【每周技巧】声母 b/p 的家庭辨听训练\n很多家长反馈孩子 b/p 分不清。今天分享一个厨房就能做的游戏：准备「杯子」和「盘子」，你藏起来一样让孩子听声音找。先只练听，不要求说，降低压力。",
    media: [{ kind: "video", caption: "03:24 教学短视频", gradient: G.indigo, duration: "03:24" }],
    tags: ["治疗师专栏", "声母训练", "家庭游戏"],
    likes: 156,
    comments: [
      { id: "c-3", authorName: "王爸爸", avatar: "🐻", role: "parent", content: "请问几岁开始练声母比较好？", time: "3小时前" },
      {
        id: "c-4",
        authorName: "李治疗师",
        avatar: "🩺",
        role: "therapist",
        verified: true,
        content: "一般孩子在「识别」阶段稳定后（约术后6-12个月）就可以引入，但要以听为主，别急着纠发音。",
        time: "2小时前",
        isProReply: true,
      },
    ],
    favorites: 48,
    shares: 21,
    therapistReply: "李治疗师：识别阶段稳定后（约术后6-12个月）可引入，以听为主。",
  },
  {
    id: "p-3",
    type: "qa",
    channel: "mood",
    author: {
      name: "王爸爸",
      avatar: "🐻",
      role: "parent",
      verified: false,
      stage: "integrate",
      stageLabel: "术后2年 · 融合期",
    },
    time: "昨天",
    ageHours: 26,
    text: "孩子下周要上幼儿园了，焦虑得睡不着。有没有过来人分享下融合经验？特别是怎么和老师沟通孩子的听力情况。",
    media: [],
    tags: ["心情树洞", "融合准备", "幼儿园"],
    likes: 45,
    comments: [
      { id: "c-5", authorName: "赵妈妈", avatar: "🦊", role: "parent", content: "提前和老师约一次面谈，把孩子的设备、应急处理方式写一张小卡片给老师，超有用！", time: "22小时前" },
    ],
    favorites: 12,
    shares: 3,
  },
  {
    id: "p-4",
    type: "experience",
    channel: "checkin",
    author: {
      name: "刘妈妈",
      avatar: "🐱",
      role: "parent",
      verified: false,
      stage: "adapt",
      stageLabel: "术后6个月 · 适应期",
    },
    time: "8小时前",
    ageHours: 8,
    text: "分享一个「听觉轰炸」小游戏：洗澡时反复说「水～水～水」，配合水流声，孩子现在一听到开水龙头就笑。每天固定一个场景+一个词，效果比随机说好太多。",
    media: [
      { kind: "image", caption: "浴室场景", gradient: G.sky },
      { kind: "image", caption: "互动瞬间", gradient: G.emerald },
      { kind: "image", caption: "记录卡", gradient: G.amber },
    ],
    tags: ["经验分享", "听觉轰炸", "家庭游戏"],
    likes: 67,
    comments: [
      { id: "c-6", authorName: "孙妈妈", avatar: "🐼", role: "parent", content: "收藏了！明天就试", time: "6小时前" },
    ],
    favorites: 19,
    shares: 8,
    practiced: true,
  },
  {
    id: "p-5",
    type: "qa",
    channel: "device",
    author: {
      name: "周爸爸",
      avatar: "🐯",
      role: "parent",
      verified: false,
      stage: "initial",
      stageLabel: "术后初配期",
    },
    time: "10小时前",
    ageHours: 10,
    text: "刚开机第3天，孩子总去抓处理器，正常吗？怎么固定比较好？晚上睡觉要不要摘？",
    media: [],
    tags: ["设备养护", "初配期", "问答"],
    likes: 12,
    comments: [
      {
        id: "c-7",
        authorName: "王治疗师",
        avatar: "🧑‍⚕️",
        role: "therapist",
        verified: true,
        content: "开机初期抓挠很常见，可以用固定头带+逐渐延长佩戴时长来适应。夜间睡眠建议摘下并放入干燥盒，具体以调机师方案为准。",
        time: "9小时前",
        isProReply: true,
      },
    ],
    favorites: 3,
    shares: 1,
    therapistReply: "王治疗师：初期抓挠常见，用固定头带+渐进佩戴；夜间摘下放干燥盒。",
  },
  {
    id: "p-6",
    type: "system",
    channel: "checkin",
    author: {
      name: "康复圈小助手",
      avatar: "🎈",
      role: "platform",
      verified: false,
      stage: "adapt",
      stageLabel: "平台官方",
    },
    time: "昨天",
    ageHours: 30,
    text: "🎉 恭喜 朵朵（术后8个月）完成连续 30 天训练打卡！每一天的坚持，都是通往清晰世界的脚步。下一位连续打卡王会是你吗？",
    media: [{ kind: "image", caption: "里程碑祝贺", gradient: G.rose }],
    tags: ["系统精选", "打卡里程碑"],
    likes: 30,
    comments: [],
    favorites: 9,
    shares: 6,
  },
  {
    id: "p-7",
    type: "experience",
    channel: "mood",
    author: {
      name: "赵妈妈",
      avatar: "🦊",
      role: "parent",
      verified: false,
      stage: "improve",
      stageLabel: "术后1年 · 提升期",
    },
    time: "12小时前",
    ageHours: 12,
    text: "今天孩子第一次自己说出了「爸爸」，没有提示，眼泪一下就止不住了。这一年的崩溃都值了。",
    media: [{ kind: "image", caption: "温馨瞬间", gradient: G.pink }],
    tags: ["心情树洞", "提升期", "第一次说话"],
    likes: 89,
    comments: [
      { id: "c-8", authorName: "钱妈妈", avatar: "🐹", role: "parent", content: "看哭了😭 替你开心", time: "11小时前" },
    ],
    favorites: 22,
    shares: 14,
  },
  {
    id: "p-8",
    type: "checkin",
    channel: "integrate",
    author: {
      name: "孙妈妈",
      avatar: "🐼",
      role: "parent",
      verified: false,
      stage: "integrate",
      stageLabel: "术后2年 · 融合期",
    },
    time: "1天前",
    ageHours: 34,
    text: "今天在公园，孩子主动和小朋友打招呼说「你好」！融合训练慢慢看到成效，老母亲欣慰。",
    media: [{ kind: "image", caption: "公园社交", gradient: G.emerald }],
    tags: ["融合准备", "今日训练打卡", "社交"],
    likes: 54,
    comments: [],
    favorites: 11,
    shares: 4,
    practiced: true,
  },
  {
    id: "p-9",
    type: "therapist",
    channel: "integrate",
    author: {
      name: "王治疗师",
      avatar: "🧑‍⚕️",
      role: "therapist",
      org: "听语康复中心",
      verified: true,
      stage: "improve",
      stageLabel: "认证专家",
    },
    time: "2天前",
    ageHours: 50,
    text: "开学季融合准备清单（家长版）：\n1. 给老师的一页纸：孩子听力情况+设备说明+应急联系人\n2. 和孩子练习「我戴了助听器，听不清时会请你重复」\n3. 准备 spare 电池/干燥盒放学校\n4. 前两周每天和老师简短沟通一次",
    media: [
      { kind: "image", caption: "清单图1", gradient: G.amber },
      { kind: "image", caption: "清单图2", gradient: G.blue },
    ],
    tags: ["融合准备", "治疗师专栏", "开学季"],
    likes: 120,
    comments: [
      { id: "c-9", authorName: "王爸爸", avatar: "🐻", role: "parent", content: "正需要这个，谢谢老师！", time: "1天前" },
    ],
    favorites: 40,
    shares: 33,
    therapistReply: undefined,
  },
  {
    id: "p-10",
    type: "experience",
    channel: "checkin",
    author: {
      name: "吴妈妈",
      avatar: "🐹",
      role: "parent",
      verified: false,
      stage: "adapt",
      stageLabel: "术后6个月 · 适应期",
    },
    time: "3天前",
    ageHours: 72,
    text: "用绘本做辨听游戏的小技巧：读《好饿的毛毛虫》时，把「毛毛虫」这个词说得特别慢、特别清楚，其他词正常语速，孩子很快就学会在这页等这个词了。",
    media: [
      { kind: "image", caption: "绘本共读", gradient: G.violet },
      { kind: "image", caption: "重点词卡", gradient: G.pink },
    ],
    tags: ["经验分享", "绘本共读", "辨听游戏"],
    likes: 41,
    comments: [
      { id: "c-10", authorName: "张妈妈", avatar: "🐰", role: "parent", content: "我们也在读这本！试试看", time: "2天前" },
    ],
    favorites: 13,
    shares: 5,
    practiced: true,
  },
  {
    id: "p-11",
    type: "qa",
    channel: "device",
    author: {
      name: "李妈妈",
      avatar: "🐰",
      role: "parent",
      verified: false,
      stage: "initial",
      stageLabel: "术后初配期",
    },
    time: "4天前",
    ageHours: 96,
    text: "调机后声音好像变小了，正常吗？需要马上回去调吗？",
    media: [],
    tags: ["设备养护", "问答", "调机"],
    likes: 9,
    comments: [
      {
        id: "c-11",
        authorName: "李治疗师",
        avatar: "🩺",
        role: "therapist",
        verified: true,
        content: "调机后短时间内有适应过程是可能的，但如果明显变小或孩子抗拒，建议联系调机师评估，不要自行调大。",
        time: "4天前",
        isProReply: true,
      },
    ],
    favorites: 2,
    shares: 0,
    therapistReply: "李治疗师：短期适应可能，明显变小或抗拒请联系调机师。",
  },
  {
    id: "p-12",
    type: "experience",
    channel: "mood",
    author: {
      name: "陈妈妈",
      avatar: "🐥",
      role: "parent",
      verified: false,
      stage: "adapt",
      stageLabel: "术后3个月 · 适应期",
    },
    time: "6小时前",
    ageHours: 6,
    text: "最近真的要崩溃了，感觉孩子戴了助听器还是没反应，是不是我哪里做错了…每天都很焦虑，晚上睡不着。",
    media: [],
    tags: ["心情树洞", "焦虑", "适应期"],
    likes: 8,
    comments: [
      { id: "c-12", authorName: "刘妈妈", avatar: "🐱", role: "parent", content: "抱抱，3个月还在适应期，别给自己太大压力，你已经做得很好了。", time: "5小时前" },
    ],
    favorites: 1,
    shares: 0,
    negative: true,
  },
];

// ---------- 排序算法（简化版，确定性，不用 Date） ----------
function timeDecay(ageHours: number): number {
  if (ageHours <= 24) return 1;
  if (ageHours <= 168) return Math.max(0.05, 1 - (ageHours / 168) * 0.7);
  return 0.05;
}

function interactionScore(p: Post): number {
  return p.likes * 1 + p.comments.length * 3 + p.favorites * 2 + p.shares * 4;
}

function matchScore(p: Post, current: LearningStageId): number {
  if (p.type === "therapist" || p.type === "system") return 1.0; // 治疗师/系统内容面向全体
  const ci = STAGE_ORDER.indexOf(current);
  const pi = STAGE_ORDER.indexOf(p.author.stage);
  if (pi === ci) return 1.0;
  if (Math.abs(pi - ci) === 1) return 0.5;
  return 0.1;
}

export function computeScore(p: Post, current: LearningStageId = CURRENT_STAGE): number {
  let s = timeDecay(p.ageHours) * 0.3 + Math.min(interactionScore(p), 400) / 400 * 0.4 + matchScore(p, current) * 0.3;
  if (p.type === "therapist") s *= 1.15; // 治疗师专栏优先
  else if (p.author.stage === current && p.type !== "system") s *= 1.1; // 同阶段加权
  if (p.negative) s *= 0.3; // 负面情绪降权（但仍展示）
  return s;
}

// ---------- 本地存档 ----------
const KEY = "avt_community_state_v1";

export interface CommunityState {
  liked: Record<string, boolean>;
  favorited: Record<string, boolean>;
  comments: Record<string, Comment[]>; // 用户新增评论，按 postId
  userPosts: Post[];
  points: number;
  badges: string[];
  communityDates: string[]; // 发布日期 YYYY-MM-DD（联动成长日历 💬）
}

function emptyState(): CommunityState {
  return { liked: {}, favorited: {}, comments: {}, userPosts: [], points: 0, badges: [], communityDates: [] };
}

export function loadState(): CommunityState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

export function saveState(s: CommunityState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

// 合并种子帖与用户发布帖，并叠加用户互动状态
export function buildFeed(state: CommunityState, current: LearningStageId = CURRENT_STAGE): Post[] {
  const all: Post[] = [...state.userPosts, ...SEED_POSTS];
  return all
    .map((p) => {
      const extraComments = state.comments[p.id] || [];
      const likes = p.likes + (state.liked[p.id] ? 1 : 0);
      const favorites = p.favorites + (state.favorited[p.id] ? 1 : 0);
      const comments = [...extraComments, ...p.comments.filter((c) => !extraComments.some((ec) => ec.id === c.id))];
      // 用户新评论排在最前
      comments.sort((a, b) => (a.isProReply ? -1 : 0) - (b.isProReply ? -1 : 0));
      return { ...p, likes, favorites, comments };
    })
    .sort((a, b) => computeScore(b, current) - computeScore(a, current));
}

export function toggleLike(state: CommunityState, id: string): CommunityState {
  const liked = { ...state.liked };
  let points = state.points;
  if (liked[id]) { delete liked[id]; points = Math.max(0, points - 1); }
  else { liked[id] = true; points += 1; }
  const next = { ...state, liked, points };
  saveState(next);
  return next;
}

export function toggleFavorite(state: CommunityState, id: string): CommunityState {
  const favorited = { ...state.favorited };
  let points = state.points;
  if (favorited[id]) { delete favorited[id]; }
  else { favorited[id] = true; points += 1; }
  const next = { ...state, favorited, points };
  saveState(next);
  return next;
}

export function addComment(state: CommunityState, id: string, content: string): CommunityState {
  const c: Comment = {
    id: "u-" + Date.now(),
    authorName: "我",
    avatar: "🙂",
    role: "parent",
    content,
    time: "刚刚",
  };
  const comments = { ...state.comments };
  comments[id] = [c, ...(comments[id] || [])];
  const points = state.points + 3;
  const next = { ...state, comments, points };
  saveState(next);
  return next;
}

// 发布新帖
export interface PublishInput {
  type: PostType;
  channel: Exclude<ChannelId, "recommend">;
  text: string;
  format: "text" | "image" | "video";
  mediaCount: number; // 图文时的图片数量（原型用占位）
  tags: string[];
  relatedTask?: string;
}

const NEGATIVE_WORDS = ["崩溃", "想放弃", "活不下去", "撑不下去", "不想活", "绝望"];
function isNegative(text: string): boolean {
  return NEGATIVE_WORDS.some((w) => text.includes(w));
}

export function publishPost(state: CommunityState, input: PublishInput): { state: CommunityState; postId: string } {
  const id = "u-" + Date.now();
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const media: MediaItem[] = [];
  if (input.format === "video") {
    media.push({ kind: "video", caption: "短视频封面", gradient: G.indigo, duration: "00:15" });
  } else {
    for (let i = 0; i < input.mediaCount; i++) {
      media.push({ kind: "image", caption: `图片${i + 1}`, gradient: G.blue });
    }
  }
  const negative = isNegative(input.text);
  const post: Post = {
    id,
    type: input.type,
    channel: input.channel,
    author: { ...CURRENT_USER },
    time: "刚刚",
    ageHours: 0,
    text: input.text,
    media,
    tags: input.tags,
    likes: 0,
    comments: [],
    favorites: 0,
    shares: 0,
    practiced: !!input.relatedTask,
    relatedTask: input.relatedTask,
    negative,
  };
  const userPosts = [post, ...state.userPosts];
  const communityDates = state.communityDates.includes(dateStr)
    ? state.communityDates
    : [...state.communityDates, dateStr];
  // 积分：发布 +5，训练打卡 +10
  const gain = input.type === "checkin" ? 10 : 5;
  const badges = [...state.badges];
  if (!badges.includes("🌱") && userPosts.length >= 1) badges.push("🌱"); // 康复记录者
  const next: CommunityState = {
    ...state,
    userPosts,
    communityDates,
    points: state.points + gain,
    badges,
  };
  saveState(next);
  return { state: next, postId: id };
}

// 当前用户阶段（演示固定为适应期）
export function loadCommunityDates(state: CommunityState): string[] {
  return state.communityDates;
}

// 供成长日历直接读取（不依赖已加载的 state）
export function loadCommunityDatesFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.communityDates) ? parsed.communityDates : [];
  } catch {
    return [];
  }
}

// ---------- 个人中心（个人主页）检索 ----------
// 全部帖（用户发布 + 种子），用于按 id 反查与检索
export function getAllPosts(state: CommunityState): Post[] {
  return [...state.userPosts, ...SEED_POSTS];
}

// 把用户互动状态叠回单个帖（点赞/收藏 + 用户新增评论），与 buildFeed 逻辑一致
function overlayPost(state: CommunityState, p: Post): Post {
  const likes = p.likes + (state.liked[p.id] ? 1 : 0);
  const favorites = p.favorites + (state.favorited[p.id] ? 1 : 0);
  const extra = state.comments[p.id] || [];
  const comments = [
    ...extra,
    ...p.comments.filter((c) => !extra.some((e) => e.id === c.id)),
  ];
  comments.sort((a, b) => (b.isProReply ? 1 : 0) - (a.isProReply ? 1 : 0));
  return { ...p, likes, favorites, comments };
}

export interface UserProfileStats {
  publishCount: number; // 发布数
  likeReceived: number; // 获赞数（别人给我的点赞）
  collectCount: number; // 我的收藏数
  commentCount: number; // 我的评论数
  likeGiven: number; // 我点赞别人的数量
}

// 个人主页统计（按方案 user_social_actions 思路聚合）
export function getUserProfile(state: CommunityState): UserProfileStats {
  const mine = getAllPosts(state).filter((p) => p.author.name === CURRENT_USER.name);
  const likeReceived = mine.reduce(
    (s, p) => s + p.likes + (state.liked[p.id] ? 1 : 0),
    0
  );
  const collectCount = Object.keys(state.favorited).length;
  const commentCount = Object.values(state.comments).reduce((s, arr) => s + arr.length, 0);
  const likeGiven = Object.keys(state.liked).length;
  return {
    publishCount: mine.length,
    likeReceived,
    collectCount,
    commentCount,
    likeGiven,
  };
}

// 我的发布：当前用户发布的帖，按时间倒序（ageHours 小=新）
export function getUserPosts(state: CommunityState): Post[] {
  return getAllPosts(state)
    .filter((p) => p.author.name === CURRENT_USER.name)
    .map((p) => overlayPost(state, p))
    .sort((a, b) => a.ageHours - b.ageHours);
}

export interface UserCommentRef {
  post: Post;
  comment: Comment;
}

// 我的评论：用户在各帖下的评论，附所属帖
export function getUserComments(state: CommunityState): UserCommentRef[] {
  const all = getAllPosts(state);
  const refs: UserCommentRef[] = [];
  for (const [postId, list] of Object.entries(state.comments)) {
    const post = all.find((p) => p.id === postId);
    if (!post) continue;
    for (const comment of list) refs.push({ post: overlayPost(state, post), comment });
  }
  // 最新评论在前
  return refs.reverse();
}

// 我点赞的
export function getLikedPosts(state: CommunityState): Post[] {
  return getAllPosts(state)
    .filter((p) => state.liked[p.id])
    .map((p) => overlayPost(state, p))
    .sort((a, b) => a.ageHours - b.ageHours);
}

// 我收藏的
export function getFavoritedPosts(state: CommunityState): Post[] {
  return getAllPosts(state)
    .filter((p) => state.favorited[p.id])
    .map((p) => overlayPost(state, p))
    .sort((a, b) => a.ageHours - b.ageHours);
}
