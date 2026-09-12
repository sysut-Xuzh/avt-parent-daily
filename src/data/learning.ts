// =====================================================================
// 每日学习模块 —— 内容数据层
// 设计原则：混合内容策略
//   1) 自撰示例图文（基于公开标准/行业共识改编，无版权问题）
//   2) 外部精选资源（以"外链 + 署名"方式跳转官方页面，不转存）
//   3) 占位 UGC / 合作内容（结构预留，后续接 CMS / 治疗师端）
// 注：当前工程无后端，内容以本地种子数组存在；接入真实 CMS 时只改本文件数据源。
// =====================================================================

import { mockTasks } from "@/data/mock-data";
import type { DailyTask } from "@/types";
import { BOOK_ITEMS } from "@/data/books";

// 今日训练任务（本地种子；接入后端后改为读取 /api/tasks/today）
export const mockTasksToday: DailyTask[] = mockTasks;

// ---------------------------------------------------------------- 类型
export type LearningCategoryId =
  | "auditory" // 🎧 听觉训练
  | "speech" // 🗣️ 言语矫治
  | "language" // 📚 语言发展
  | "cognitive" // 🧠 认知沟通
  | "support"; // 💝 心理支持

export type LearningStageId =
  | "initial" // 初配期
  | "adapt" // 适应期
  | "improve" // 提升期
  | "integrate"; // 融合期

export type LearningFormatId =
  | "article" // 图文短文
  | "video" // 短视频
  | "audio" // 音频课
  | "series" // 系列专题课
  | "pdf" // 图文手册
  | "live" // 直播讲座
  | "book"; // 绘本 / 书籍

export interface LearningCategory {
  id: LearningCategoryId;
  name: string;
  emoji: string;
  color: string; // hex，用于卡片底色/文字
  desc: string;
}

export interface LearningStage {
  id: LearningStageId;
  name: string;
  color: string;
  desc: string;
}

export interface LearningFormat {
  id: LearningFormatId;
  name: string;
  emoji: string;
}

export interface LearningQA {
  parentAvatar: string;
  parentName: string;
  parentText: string;
  therapistText: string; // 治疗师专业回复
}

export interface LearningItem {
  id: string;
  title: string;
  summary: string;
  category: LearningCategoryId;
  stage: LearningStageId;
  format: LearningFormatId;
  durationLabel: string; // 如 "3分钟"
  emoji: string; // 封面 emoji
  // 自撰图文：body 段落 + 关键要点 + 小贴士
  body?: string[];
  keyPoints?: string[];
  tips?: string[];
  // 外部资源：跳转官方页面（不转存）
  externalUrl?: string;
  sourceLabel?: string; // 来源署名
  // 作者 / 认证（详情页头部 + 三数据卡）
  author?: string; // 如 "AVT 家长学堂 · 李治疗师"
  certified?: boolean; // 是否为认证专家（显示 👨‍⚕️ 认证专家 徽章）
  recommendPct?: number; // 推荐值 0-100（文章用，书籍用 book.recommendPct）
  readers?: string; // 学习人数文案（文章用，书籍用 book.readers）
  // 家长笔记 · 答疑区：家长提问 + 治疗师专业回复
  qa?: LearningQA[];
  // 学与练联动：关联今日训练任务的关键词（命中 targetWord / scene / strategy）
  relatedKeywords: string[];
  featured?: boolean; // 是否可作为每日推荐
  // 绘本 / 书籍专属
  book?: {
    author: string;
    publisher?: string;
    translator?: string;
    coverColor: string; // 封面主色 / 渐变起始色
    coverGradient?: string; // 完整渐变，如 "#f59e0b,#ef4444"
    tags: string[]; // 如 ["绘本", "亲情", "睡前"]
    difficulty: "入门" | "初阶" | "中阶" | "高阶";
    recommendPct: number; // 推荐值 0-100
    readers: string; // 阅读人数文案，如 "12.8w"
    intro: string[]; // 书籍简介段落
    authorIntro: string; // 作者简介
    reviews: { avatar: string; name: string; content: string; rating: number }[];
    readUrl: string; // 开始阅读 / 购买 / 试读跳转地址
    priceNote?: string; // 价格/来源提示，如 "京东自营 · 约 ¥28"
  };
  // 语音练习（声线测试全站集成方案 §5）：是否可作为「去练习」语音练习入口
  voice_enabled?: boolean;
  voice_keywords?: string[]; // 练习目标词，如 ["爸爸","妈妈"]
}

// 声线练习默认词表（无指定内容时使用的通用跟读词）
export const DEFAULT_PRACTICE_WORDS = ["爸爸", "妈妈", "抱抱", "苹果", "汽车"];

// ---------------------------------------------------------------- 分类 / 阶段 / 形式
export const LEARNING_CATEGORIES: LearningCategory[] = [
  { id: "auditory", name: "听觉训练", emoji: "🎧", color: "#6366f1", desc: "声音察知、环境音辨识、听觉记忆" },
  { id: "speech", name: "言语矫治", emoji: "🗣️", color: "#ec4899", desc: "构音纠正、口肌训练、声调语调" },
  { id: "language", name: "语言发展", emoji: "📚", color: "#14b8a6", desc: "词汇扩展、句型教学、绘本共读" },
  { id: "cognitive", name: "认知沟通", emoji: "🧠", color: "#f59e0b", desc: "逻辑游戏、社交模拟、叙事培养" },
  { id: "support", name: "心理支持", emoji: "💝", color: "#f43f5e", desc: "情绪管理、亲子沟通、融合准备" },
];

export const LEARNING_STAGES: LearningStage[] = [
  { id: "initial", name: "初配期", color: "#06b6d4", desc: "术后0-3个月 / 初戴助听器" },
  { id: "adapt", name: "适应期", color: "#3b82f6", desc: "术后3-12个月" },
  { id: "improve", name: "提升期", color: "#8b5cf6", desc: "术后1-2年" },
  { id: "integrate", name: "融合期", color: "#10b981", desc: "术后2年以上" },
];

export const LEARNING_FORMATS: LearningFormat[] = [
  { id: "article", name: "图文", emoji: "📄" },
  { id: "video", name: "短视频", emoji: "🎬" },
  { id: "audio", name: "音频课", emoji: "🔊" },
  { id: "series", name: "系列课", emoji: "🗂️" },
  { id: "pdf", name: "手册", emoji: "📘" },
  { id: "live", name: "直播", emoji: "📡" },
  { id: "book", name: "绘本", emoji: "📚" },
];

export const getCategory = (id: LearningCategoryId) =>
  LEARNING_CATEGORIES.find((c) => c.id === id)!;
export const getStage = (id: LearningStageId) =>
  LEARNING_STAGES.find((s) => s.id === id)!;
export const getFormat = (id: LearningFormatId) =>
  LEARNING_FORMATS.find((f) => f.id === id)!;

// ---------------------------------------------------------------- 内容种子
// 说明：externalUrl 为公开资源官网首页/栏目示例链接，仅作跳转演示；
//       接真实内容时替换为已获授权的深链，并保留 sourceLabel 署名。
export const RAW_ITEMS: LearningItem[] = [
  // ===================== 自撰示例图文（基于公开标准改编） =====================
  {
    id: "a-avt-10",
    title: "AVT 家庭训练的 10 个原则",
    summary: "听觉口语法（AVT）的核心理念，翻译成家长能落地的 10 条家庭做法。",
    category: "support",
    stage: "initial",
    format: "article",
    durationLabel: "5分钟",
    emoji: "🌟",
    featured: true,
    relatedKeywords: [],
    body: [
      "听觉口语法（Auditory-Verbal Therapy, AVT）强调让听障儿童通过听觉来学习语言，而不是依赖看口型或手势。",
      "以下是国际 AVT 协会提炼、并适合家庭场景落地的 10 条原则：",
    ],
    keyPoints: [
      "尽早干预：发现听力损失后尽快选配助听设备并开训",
      "听觉优先：先让孩子“听”，再引导“说”，不强迫看嘴",
      "把训练藏进日常生活：洗澡、吃饭、游戏都是机会",
      "多重复、慢一点：同一个词在不同场景反复输入",
      "跟随孩子的兴趣：用他关注的玩具/事件来教语言",
      "创造丰富的听觉环境：多描述你正在做的事",
      "少用手势提示：用声音和期待的眼神代替",
      "一次一个目标：一个阶段专注几个目标词",
      "正面鼓励：每个微小反应都值得庆祝",
      "记录与复诊：定期和治疗师复盘进步",
    ],
    tips: ["这 10 条不必一次做到位，从“听觉优先”和“日常输入”两条先练起即可。"],
  },
  {
    id: "a-linx6",
    title: "林氏六音检测的正确方法",
    summary: "用 m、u、a、i、sh、s 六个音快速判断孩子能不能听到——居家就能做。",
    category: "auditory",
    stage: "initial",
    format: "article",
    durationLabel: "4分钟",
    emoji: "🔔",
    featured: true,
    relatedKeywords: ["声音", "察知", "林氏"],
    body: [
      "林氏六音（Ling’s Six Sounds）是评估听觉补偿效果最简便的工具，覆盖低频到高频：m（低）、u（低）、a（中）、i（中高）、sh（高）、s（高）。",
      "操作方法：在孩子看不到你嘴部的位置（侧后方），以正常音量依次发这六个音，观察孩子是否有反应（转头、停动作、微笑等）。",
    ],
    keyPoints: [
      "发音要短、自然，不要拖长",
      "孩子不能看你的脸和嘴唇",
      "六个音随机顺序，不要固定套路",
      "每天可做 1-2 次，记录哪些音有反应",
      "若某个高频音（sh/s）长期无反应，及时复诊调机",
    ],
    tips: ["林氏六音是“筛查”不是“诊断”，发现异常请找听力师，不要自己下结论。"],
  },
  {
    id: "a-env",
    title: "如何创造“安静 + 丰富”的听觉环境",
    summary: "背景噪音是康复的大敌。三步给孩子一个听得清的家。",
    category: "auditory",
    stage: "initial",
    format: "article",
    durationLabel: "3分钟",
    emoji: "🏠",
    relatedKeywords: ["声音", "环境"],
    body: [
      "孩子刚开机/戴机时，区分“声音存在”都很吃力，更别说在噪音里听清。家庭环境要做两件事：降噪 + 多说。",
    ],
    keyPoints: [
      "关掉背景电视、音乐，说话时尽量安静",
      "面对面距离控制在 1 米内，让孩子有机会看表情但不依赖",
      "把日常流程“说出来”：穿衣、做饭、上厕所都描述",
      "用稍慢、稍夸张的语调，但别怪声怪气",
    ],
    tips: ["不需要时刻不停说话，抓住“关键场景”高质量输入更重要。"],
  },
  {
    id: "a-bigsmall",
    title: "从察知到分辨：大小声游戏大全",
    summary: "孩子能“听到”了，下一步教他听出“不一样”——大小声、高低音。",
    category: "auditory",
    stage: "adapt",
    format: "article",
    durationLabel: "4分钟",
    emoji: "🔊",
    relatedKeywords: ["分辨", "大小声"],
    body: [
      "分辨是听觉发展的第二阶段：孩子要能听出两个声音之间的不同（大小、高低、长短）。",
    ],
    keyPoints: [
      "大小声：敲大鼓 vs 小鼓，让孩子指“哪个更响”",
      "高低音：用不同音高的乐器或人声，玩“谁是哥哥音”",
      "长短音：一个长“呜——”，一个短“呜”，比一比",
      "先听后选：每边各听一次，再让孩子指不同",
    ],
    tips: ["在家可用锅碗瓢盆代替乐器，照样练分辨。"],
  },
  {
    id: "a-book",
    title: "绘本共读：不是读字，是“聊”书",
    summary: "很多家长把绘本当识字卡。正确打开方式，是借书和孩子聊起来。",
    category: "language",
    stage: "adapt",
    format: "article",
    durationLabel: "5分钟",
    emoji: "📖",
    featured: true,
    relatedKeywords: ["晚安", "绘本", "语言"],
    body: [
      "绘本是语言输入的黄金载体，但“照着念字”效果有限。AVT 提倡把绘本变成对话。",
    ],
    keyPoints: [
      "选图大、字少、贴近生活的绘本",
      "用提问代替朗读：“猜猜小熊要去哪？”",
      "重复关键词，配合听觉输入",
      "一套书反复读，孩子会更敢接话",
      "睡前共读还能顺带练“晚安”等社交语",
    ],
    tips: ["孩子不接话也别急，你多说、他多听，就是进步。"],
  },
  {
    id: "a-oral",
    title: "口肌训练：吹泡泡和吸管的妙用",
    summary: "构音需要先有“嘴的力气”。两个居家小游戏帮孩子练口肌。",
    category: "speech",
    stage: "adapt",
    format: "article",
    durationLabel: "3分钟",
    emoji: "🫧",
    relatedKeywords: ["构音", "口肌"],
    body: [
      "清晰的发音需要足够的口部肌肉力量和气息控制。吹泡泡、用吸管都是低门槛的口肌游戏。",
    ],
    keyPoints: [
      "吹泡泡：练圆唇和持续气息",
      "粗吸管喝稠一点的饮品：练吸吮力度",
      "递阶：从大声“呼”到小声“呼”，控制气流",
      "每次 2-3 分钟，融入游戏不勉强",
    ],
    tips: ["口肌训练是“辅助”，最终目标还是回到听和说，不要本末倒置。"],
  },
  {
    id: "a-memory",
    title: "听觉记忆训练：从 1 项到 4 项指令",
    summary: "能听一个词，不代表能听一串。一步步拉长孩子的听觉记忆。",
    category: "cognitive",
    stage: "improve",
    format: "article",
    durationLabel: "4分钟",
    emoji: "🧩",
    relatedKeywords: ["记忆", "指令"],
    body: [
      "听觉记忆是理解和沟通的基础。从单步指令慢慢加到多步，是提升期的重要目标。",
    ],
    keyPoints: [
      "第1步：先练“去拿XX”单指令",
      "第2步：两个不相关 item：“拿XX和XX”",
      "第3步：有顺序的：“先XX，再XX”",
      "第4步：加入方位/属性：“把红色的XX放到桌上”",
      "始终用正常语速，不拆成慢动作",
    ],
    tips: ["孩子卡住时，退回上一步，别一口气拔高难度。"],
  },
  {
    id: "a-selfadv",
    title: "听障儿童的自我倡导能力培养",
    summary: "融合期的关键一课：让孩子学会主动说“我需要再听一遍”。",
    category: "support",
    stage: "integrate",
    format: "article",
    durationLabel: "5分钟",
    emoji: "🦸",
    relatedKeywords: ["融合", "自我倡导"],
    body: [
      "随着孩子进入幼儿园/小学，他需要学会管理自己的听力和沟通需求，而不是依赖家长代劳。",
    ],
    keyPoints: [
      "教孩子认识自己的设备：叫什么、怎么开",
      "练习说：“老师，我没听清，可以再说一次吗？”",
      "和小伙伴解释：“我戴了耳蜗，声音从这边来”",
      "预演课堂场景：坐在前排、看老师脸",
    ],
    tips: ["自我倡导越早练越好，从家庭里“请再说一遍”开始。"],
  },
  {
    id: "a-fruit",
    title: "水果名词的家庭泛化教学",
    summary: "今日练了“苹果”？这篇教你怎么把课堂词带进一日生活。",
    category: "language",
    stage: "adapt",
    format: "article",
    durationLabel: "3分钟",
    emoji: "🍎",
    featured: true,
    relatedKeywords: ["苹果", "水果", "名词"],
    body: [
      "治疗师课堂上教了“苹果”，但孩子要在真实生活里反复听到、用到，才算真正掌握。",
    ],
    keyPoints: [
      "买菜时指着真苹果说“苹果”",
      "吃的时候描述：“红红的苹果，咬一口，脆脆的”",
      "玩假装游戏：水果摊买卖，反复用名词",
      "同一词在不同场景出现，比机械重复更有效",
    ],
    tips: ["把“今日目标词”贴在冰箱上，全家统一说法。"],
  },
  {
    id: "a-animal",
    title: "动物叫声辨识：从察知到理解的家庭游戏",
    summary: "今日任务有“狗”？用这篇把动物叫声玩成听觉游戏。",
    category: "auditory",
    stage: "adapt",
    format: "article",
    durationLabel: "3分钟",
    emoji: "🐶",
    featured: true,
    relatedKeywords: ["狗", "动物", "叫声"],
    body: [
      "动物叫声是孩子最感兴趣的听辨素材，天然适合从“听到”过渡到“理解”。",
    ],
    keyPoints: [
      "先听真声/拟声，观察孩子是否转头（察知）",
      "再玩“哪个是小狗”听音指图（分辨/识别）",
      "进阶：问“谁在叫？”让孩子说出动物（理解）",
      "学动物叫声本身也是很好的构音练习",
    ],
    tips: ["不用真动物，你模仿“汪汪”孩子就更愿意参与。"],
  },

  // ===================== 外部精选资源（外链 + 署名，不转存） =====================
  {
    id: "e-medel",
    title: "MED-EL 康复下载中心",
    summary: "官方免费提供的儿童活动手册、家长指南与课程套件，权威且体系化。",
    category: "language",
    stage: "initial",
    format: "pdf",
    durationLabel: "自行安排",
    emoji: "📘",
    externalUrl: "https://www.medel.com/zh/rehabilitation",
    sourceLabel: "MED-EL 官方",
    relatedKeywords: [],
  },
  {
    id: "e-sld2000",
    title: "香港 SLD2000 AVT 讲座（中英双语）",
    summary: "8 讲听觉口语法社区教育视频，非常好的新家长入门材料。",
    category: "support",
    stage: "initial",
    format: "video",
    durationLabel: "系列视频",
    emoji: "🎬",
    externalUrl: "https://www.sld2000.org.hk/",
    sourceLabel: "香港 SLD2000",
    relatedKeywords: [],
  },
  {
    id: "e-deaforg",
    title: "聋康网 · 听语学院课程",
    summary: "大量中文录播课程与直播回放，涵盖康复各阶段，可系统学习。",
    category: "support",
    stage: "adapt",
    format: "series",
    durationLabel: "系列课",
    emoji: "🗂️",
    externalUrl: "http://www.chinadeaf.org/",
    sourceLabel: "聋康网",
    relatedKeywords: [],
  },
  {
    id: "e-live",
    title: "专家直播讲座（示例）",
    summary: "定期更新的行业专家直播/录播，如听力协会合作内容。接入后替换为真实排期。",
    category: "support",
    stage: "improve",
    format: "live",
    durationLabel: "45-60分钟",
    emoji: "📡",
    externalUrl: "https://www.chinadeaf.org/",
    sourceLabel: "行业专家（示例）",
    relatedKeywords: [],
  },

  // ===================== 本土化内容（基于国内公开康复指南/评估标准，按 Erber 能力维度打标） =====================
  {
    id: "d-cochlear",
    title: "人工耳蜗术后居家康复要点",
    summary: "开机后前 3 个月是黄金期，家长在家怎么帮孩子“重新听世界”。",
    category: "support",
    stage: "initial",
    format: "article",
    durationLabel: "6分钟",
    emoji: "🦻",
    relatedKeywords: ["人工耳蜗", "术后", "开机"],
    body: [
      "人工耳蜗开机后，孩子听到的声音和术前完全不同，需要一个“重新学习听”的过程。",
      "《人工耳蜗术后康复指南》强调：家庭是康复的主战场，家长是最关键的“康复老师”。",
    ],
    keyPoints: [
      "开机第 1 周：先让孩子适应各种环境声（水流、门铃、人声），不急于要求“说”",
      "每天固定 15-20 分钟“听觉play”时间，用 toys+声音吸引注意",
      "多描述、少提问：边做边说“妈妈在洗碗～哗啦啦～”",
      "记录孩子对哪些声音有反应，复诊时带给听力师",
      "避免在孩子耳边突然大喊，音量自然即可",
    ],
    tips: ["前 3 个月重点是“听得到、听得舒服”，说话清晰度会慢慢跟上，别着急。"],
  },
  {
    id: "d-assess",
    title: "听懂《听障儿童听觉言语评估》四大能力",
    summary: "察知、分辨、识别、理解——治疗师说的“四级”到底是什么意思。",
    category: "auditory",
    stage: "initial",
    format: "article",
    durationLabel: "5分钟",
    emoji: "📊",
    relatedKeywords: ["评估", "Erber", "四级"],
    body: [
      "国内《听障儿童听觉言语康复评估标准》沿用了 Erber 四级模型，用来描述孩子“听到→听懂”的进阶。",
      "理解这四个层级，你就能看懂测评报告里每一项在测什么。",
    ],
    keyPoints: [
      "察知（Detection）：能不能发现“有声音”（不要求听懂）",
      "分辨（Discrimination）：两个声音不一样（如“啊”和“衣”）",
      "识别（Identification）：听到能说出来/指出来（如“这是猫”）",
      "理解（Comprehension）：听懂意思并做出恰当反应（如“把红色的球给我”）",
      "四级逐级变难，上一级稳定了再练下一级",
    ],
    tips: ["测评报告里的“通过”不是终点，而是下一阶段训练的起点。"],
  },
  {
    id: "d-envsound",
    title: "居家环境声识别训练（察知级）",
    summary: "闹钟、门铃、水流、车声——先让孩子“听得到”这些日常声。",
    category: "auditory",
    stage: "initial",
    format: "article",
    durationLabel: "4分钟",
    emoji: "🔔",
    relatedKeywords: ["察知", "环境声", "声音"],
    body: [
      "察知是四级里最基础的一层：孩子不需要听懂，只要能对声音“有反应”。",
      "从家里最熟悉的环境声入手，最容易建立“声音=有意义”的连接。",
    ],
    keyPoints: [
      "选 3-4 种固定环境声（如闹钟、门铃、水流、摇铃）",
      "在孩子看不到声源处发声，观察是否转头/停动作",
      "孩子有反应立刻开心表扬，强化“声音值得注意”",
      "每天 2 次、每次 5 分钟，贵在坚持",
      "记录哪些声有反应，逐步增加难度",
    ],
    tips: ["别用“听不听得到？”去问，小龄孩子不会回答，看反应最准。"],
  },
  {
    id: "d-bpm",
    title: "声母辨音：b / p / m 家庭练法",
    summary: "孩子把“爸”说成“妈”？用最小对立对做识别级训练。",
    category: "speech",
    stage: "adapt",
    format: "article",
    durationLabel: "5分钟",
    emoji: "👄",
    relatedKeywords: ["识别", "声母", "辨音"],
    body: [
      "很多孩子“识别”级卡在声母混淆（b/p/m 送气与不送气、鼻音与口音）。",
      "用“最小对立对”对比听、对比说，是最有效的家庭方法。",
    ],
    keyPoints: [
      "先听辨：你说“爸—妈”，让孩子指图/选卡",
      "再模仿：夸张口型对比（b 闭唇/p 送气/m 鼻音）",
      "配对游戏：两张图（笔/米），听音翻牌",
      "每次只练 1 组对立，2 周稳定再加新组",
      "错误不批评，示范正确音让孩子再听一次",
    ],
    tips: ["若孩子正确率长期 < 60%，重点练这一组，暂停加新内容。"],
  },
  {
    id: "d-wordid",
    title: "听指令拿物：词语识别训练",
    summary: "“把红色的球给我”——从听懂单词到听懂短句。",
    category: "language",
    stage: "adapt",
    format: "article",
    durationLabel: "4分钟",
    emoji: "🧸",
    relatedKeywords: ["识别", "词语", "指令"],
    body: [
      "“识别”级进入词语层面：孩子听到词能正确选出对应物品，说明真正“听进去了”。",
      "从孩子最熟悉的玩具、食物开始，最容易成功。",
    ],
    keyPoints: [
      "准备 3-4 件实物/图卡放面前",
      "说“拿苹果”，不指、不看，等孩子自己选",
      "选对立刻给实物+表扬，选错温柔纠正",
      "逐步加干扰项（相似物品混在一起）",
      "从单词过渡到“形容词+名词”（红苹果/大球）",
    ],
    tips: ["孩子总看你的手？故意把手放背后说，逼ta用耳朵而不是眼睛。"],
  },
  {
    id: "d-story",
    title: "听故事回答问题（理解级）",
    summary: "能复述、能回答“为什么”——说明孩子真的听懂了。",
    category: "language",
    stage: "improve",
    format: "article",
    durationLabel: "6分钟",
    emoji: "📖",
    relatedKeywords: ["理解", "故事", "问答"],
    body: [
      "“理解”是四级最高层：不只是听到词，而是把握整段话的意思。",
      "听简短故事并回答问题，是训练理解力的家庭好方法。",
    ],
    keyPoints: [
      "选 1-2 句话的短故事，语速稍慢、重点词重读",
      "讲完问“谁？”“做了什么？”“为什么？”",
      "孩子答不出时，回到故事原句再听一遍",
      "鼓励用完整句回答，不只蹦词",
      "把故事和当天生活联系（“我们也去公园了对不对？”）",
    ],
    tips: ["理解力要建立在稳固的识别之上，别跳级练。"],
  },
  {
    id: "d-artic",
    title: "构音错误家庭纠正技巧",
    summary: "把“哥哥”说成“得得”？先找是哪一步出了问题。",
    category: "speech",
    stage: "adapt",
    format: "article",
    durationLabel: "5分钟",
    emoji: "🗣️",
    relatedKeywords: ["言语", "构音", "纠音"],
    body: [
      "构音错误常见于送气/不送气、舌尖/舌根位置偏差。先观察、再针对性练。",
      "家庭纠音讲究“示范—模仿—反馈”的小循环。",
    ],
    keyPoints: [
      "录下孩子说话，和治疗师确认的“目标音”对比",
      "用镜子让孩子看自己/你的口型差异",
      "从单音→音节→词→短语，循序渐进",
      "一次只纠一个音，避免让孩子无所适从",
      "游戏化：吹纸条练送气、舔酸奶练舌尖",
    ],
    tips: ["纠音是慢功夫，每周进步一点点就是胜利。"],
  },
  {
    id: "d-turn",
    title: "轮流与等待：认知沟通基础",
    summary: "会“等一等”“轮到你了”，社交沟通就入门了。",
    category: "cognitive",
    stage: "adapt",
    format: "article",
    durationLabel: "4分钟",
    emoji: "🤝",
    relatedKeywords: ["认知", "轮流", "社交"],
    body: [
      "轮流（turn-taking）是沟通和游戏的核心规则，也是语言发展的土壤。",
      "在日常互动里自然植入“等—轮”的节奏。",
    ],
    keyPoints: [
      "搭积木时“你一块、我一块”，边做边说“该宝宝啦”",
      "用沙漏/数数帮孩子理解“等待”",
      "孩子抢时，温和提醒“等一下，轮到妈妈”",
      "轮到他时夸张庆祝，强化正向体验",
      "把“轮流”迁移到和同伴的游戏中",
    ],
    tips: ["能轮流，就说明孩子开始理解“互动”而非单向输出。"],
  },
  {
    id: "d-anxiety",
    title: "家长焦虑自救指南",
    summary: "急于看到效果很正常，但你的情绪是孩子康复的“背景音”。",
    category: "support",
    stage: "initial",
    format: "article",
    durationLabel: "5分钟",
    emoji: "💗",
    relatedKeywords: ["心理", "家长", "焦虑"],
    body: [
      "几乎所有听障儿童家长都会经历焦虑期。接纳它，别让它压垮你自己。",
      "稳定的家长情绪，本身就是孩子最好的康复环境。",
    ],
    keyPoints: [
      "把大目标拆成“这一周的小进步”",
      "记录孩子每一点变化，焦虑时翻出来看",
      "加入家长互助社群，你不是一个人",
      "允许自己“今天不想训练”，休息也是康复的一部分",
      "定期和治疗师沟通，不确定的事别自己吓自己",
    ],
    tips: ["孩子感知情绪比你想的灵敏，你放松，他才敢大胆尝试。"],
  },
  {
    id: "d-integrate",
    title: "融合期：帮孩子在幼儿园被听见",
    summary: "从“会说”到“敢在集体里说”，融合需要提前准备。",
    category: "support",
    stage: "integrate",
    format: "article",
    durationLabel: "6分钟",
    emoji: "🏫",
    relatedKeywords: ["融合", "幼儿园", "同伴"],
    body: [
      "融合期目标不是“说得和标准孩子一样”，而是“能在真实社交里用语言”。",
      "提前和老师、同伴做些铺垫，孩子过渡更顺。",
    ],
    keyPoints: [
      "和老师沟通孩子的听力设备与注意事项",
      "准备 1-2 个“自我介绍小句”（“我叫XX，我戴了人工耳蜗”）",
      "角色扮演集体场景：举手、轮流发言、求助",
      "鼓励同伴互动游戏，而非孤立练习",
      "每周和治疗师复盘融合中的沟通卡点",
    ],
    tips: ["融合是长期课题，允许孩子有适应期，不追求一步到位。"],
  },
];

// ---------------------------------------------------------------- 作者 / 认证 / 数据卡 注入
// 文章（非书籍）默认由「AVT 家长学堂 · 李治疗师」署名并认证；外部资源署名来源机构。
const ARTICLE_META: Record<
  string,
  { author: string; certified?: boolean; recommendPct: number; readers: string }
> = {
  "a-avt-10": { author: "AVT 家长学堂 · 李治疗师", certified: true, recommendPct: 98, readers: "312 人学过" },
  "a-linx6": { author: "北京听力协会 · 李治疗师", certified: true, recommendPct: 96, readers: "1.2k 人学过" },
  "a-env": { author: "AVT 家长学堂 · 王听力师", certified: true, recommendPct: 94, readers: "486 人学过" },
  "a-bigsmall": { author: "AVT 家长学堂 · 李老师", certified: true, recommendPct: 92, readers: "273 人学过" },
  "a-book": { author: "绘本阅读指导 · 陈老师", certified: true, recommendPct: 95, readers: "658 人学过" },
  "a-oral": { author: "言语矫治科 · 赵治疗师", certified: true, recommendPct: 93, readers: "341 人学过" },
  "a-memory": { author: "认知康复 · 孙老师", certified: true, recommendPct: 91, readers: "219 人学过" },
  "a-selfadv": { author: "融合教育 · 周老师", certified: true, recommendPct: 90, readers: "187 人学过" },
  "a-fruit": { author: "家庭泛化 · 吴老师", certified: true, recommendPct: 94, readers: "402 人学过" },
  "a-animal": { author: "听觉游戏 · 郑老师", certified: true, recommendPct: 92, readers: "355 人学过" },
  "e-medel": { author: "MED-EL 官方", certified: true, recommendPct: 89, readers: "官方免费" },
  "e-sld2000": { author: "香港 SLD2000", certified: true, recommendPct: 90, readers: "官方免费" },
  "e-deaforg": { author: "聋康网", certified: true, recommendPct: 88, readers: "官方免费" },
  "e-live": { author: "行业专家讲座", certified: true, recommendPct: 87, readers: "即将开播" },
  "d-cochlear": { author: "中国聋儿康复研究中心 · 指导", certified: true, recommendPct: 97, readers: "528 人学过" },
  "d-assess": { author: "AVT 家长学堂 · 李治疗师", certified: true, recommendPct: 96, readers: "743 人学过" },
  "d-envsound": { author: "北京听力协会 · 王听力师", certified: true, recommendPct: 94, readers: "412 人学过" },
  "d-bpm": { author: "言语矫治科 · 赵治疗师", certified: true, recommendPct: 93, readers: "366 人学过" },
  "d-wordid": { author: "AVT 家长学堂 · 李老师", certified: true, recommendPct: 95, readers: "489 人学过" },
  "d-story": { author: "语言发展科 · 周老师", certified: true, recommendPct: 92, readers: "254 人学过" },
  "d-artic": { author: "言语矫治科 · 赵治疗师", certified: true, recommendPct: 91, readers: "298 人学过" },
  "d-turn": { author: "认知康复 · 孙老师", certified: true, recommendPct: 90, readers: "211 人学过" },
  "d-anxiety": { author: "家长心理支持 · 陈老师", certified: true, recommendPct: 96, readers: "631 人学过" },
  "d-integrate": { author: "融合教育 · 周老师", certified: true, recommendPct: 93, readers: "176 人学过" },
};

// ---------------------------------------------------------------- 家长笔记 · 答疑库
// 每条 = 家长真实困惑 + 治疗师专业回复（蓝标），是每日学习的差异化核心。
const QA_LIBRARY: Record<string, LearningQA[]> = {
  "a-linx6": [
    {
      parentAvatar: "👩",
      parentName: "张妈妈",
      parentText: "原来检测要在孩子背后发声，我一直都在正面做，难怪不准！",
      therapistText: "是的，背后测试可以避免孩子读唇，更准确地反映听觉反应。建议每天固定同一时段做，记录哪些音有反应。",
    },
    {
      parentAvatar: "👨",
      parentName: "王爸爸",
      parentText: "孩子听到 /u/ 总是没反应，是不是设备低频补偿不够？",
      therapistText: "建议先检查设备低频增益设置，同时注意 /u/ 的发音位置（圆唇、靠后）。若持续无反应，请预约调机评估。",
    },
  ],
  "a-avt-10": [
    {
      parentAvatar: "👩",
      parentName: "陈妈妈",
      parentText: "“少用手势”这条我很难做到，孩子不看我怎么办？",
      therapistText: "初期可保留少量手势作桥梁，但逐步减少。用声音 + 期待的眼神吸引注意，比手势更重要。",
    },
  ],
  "a-book": [
    {
      parentAvatar: "👩",
      parentName: "刘妈妈",
      parentText: "孩子总让我“念字”，一提问就走神，正常吗？",
      therapistText: "很正常。初期先用“听”建立兴趣，提问从最熟悉的画面开始，一次一个问题，别贪多。",
    },
  ],
  "a-oral": [
    {
      parentAvatar: "👩",
      parentName: "赵妈妈",
      parentText: "吹泡泡孩子只会吸气不会吹，要纠正吗？",
      therapistText: "先用“示范 + 辅助”：你吹给她看，再轻托她脸颊帮出气。不要硬纠，游戏化最重要。",
    },
  ],
  "a-memory": [
    {
      parentAvatar: "👨",
      parentName: "孙爸爸",
      parentText: "孩子只能听 1 项指令，多一步就忘，是不是落后了？",
      therapistText: "循序渐进即可，不要横向比较。从单步到多步是正常发展路径，每天进步一点点就很好。",
    },
  ],
  "a-selfadv": [
    {
      parentAvatar: "👩",
      parentName: "周妈妈",
      parentText: "孩子害羞不肯跟老师说“没听清”，怎么练？",
      therapistText: "在家先和家长练“请再说一次”，再和熟悉的亲友练，最后泛化到老师。给一个话术模板会更有底气。",
    },
  ],
  "a-fruit": [
    {
      parentAvatar: "👩",
      parentName: "吴妈妈",
      parentText: "课堂学了“苹果”，回家看到真苹果不认，怎么回事？",
      therapistText: "真实物体和图片/玩具差异大，需要重新配对。多在生活中指认真物，比卡片更有效。",
    },
  ],
  "a-animal": [
    {
      parentAvatar: "👨",
      parentName: "郑爸爸",
      parentText: "孩子能分辨狗叫但说不出“狗”，要逼他说吗？",
      therapistText: "先确认“理解”（听音指图），理解稳定后再引导“说”。不逼说，用模仿游戏自然带出。",
    },
  ],
  "a-env": [
    {
      parentAvatar: "👩",
      parentName: "冯妈妈",
      parentText: "家里老人爱开着电视，说不影响，真的吗？",
      therapistText: "背景噪音会淹没目标语音，尤其高频。训练时务必关掉，日常也尽量降低环境噪音。",
    },
  ],
  "a-bigsmall": [
    {
      parentAvatar: "👩",
      parentName: "蒋妈妈",
      parentText: "孩子能听出大小声，但不会指“哪个更响”，怎么办？",
      therapistText: "先用“听—选”：两边各听一次再指。配合手势（手抬高/压低）辅助，逐步撤掉。",
    },
  ],
};

function enrichItem(it: LearningItem): LearningItem {
  const meta = ARTICLE_META[it.id];
  return {
    ...it,
    author: meta?.author ?? it.author ?? (it.book ? it.book.author : "AVT 家长学堂"),
    certified: meta?.certified ?? it.certified ?? false,
    recommendPct: it.recommendPct ?? meta?.recommendPct ?? it.book?.recommendPct,
    readers: it.readers ?? meta?.readers ?? it.book?.readers,
    qa: it.qa ?? QA_LIBRARY[it.id] ?? [],
  };
}

// 对外统一导出已注入作者/认证/数据卡/答疑的文章 + 书籍
export const LEARNING_ITEMS: LearningItem[] = [
  ...RAW_ITEMS.map(enrichItem),
  ...BOOK_ITEMS,
];

// ---------------------------------------------------------------- 推荐 / 关联逻辑
// 每日推荐：按「日期」确定性选择（同一天展示同一篇，刷新不变）。
// 关键点：绝不使用 Math.random() —— 随机会导致 SSR 与客户端水合（hydration）不一致而报错。
export function getDailyRecommendation(stage: LearningStageId = "adapt"): LearningItem {
  const byStage = LEARNING_ITEMS.filter((i) => i.stage === stage && i.featured);
  const pool = byStage.length ? byStage : LEARNING_ITEMS.filter((i) => i.featured);
  if (!pool.length) return LEARNING_ITEMS[0];
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  return pool[dayOfYear % pool.length];
}

// 学与练联动：某篇内容关联到的“今日训练任务”（基于本地任务种子反查）
export function getRelatedTodayTasks(item: LearningItem): DailyTask[] {
  if (!item.relatedKeywords.length) return [];
  return mockTasks.filter((t) =>
    item.relatedKeywords.some(
      (k) => t.targetWord.includes(k) || t.scene.includes(k) || t.strategy.includes(k)
    )
  );
}

// 反向：某条今日任务关联到的学习内容（供任务卡片“去学习”角标使用）
export function getRelatedLearningForTask(task: DailyTask): LearningItem[] {
  return LEARNING_ITEMS.filter((i) =>
    i.relatedKeywords.some(
      (k) => task.targetWord.includes(k) || task.scene.includes(k) || task.strategy.includes(k)
    )
  );
}

// ---------------------------------------------------------------- 本地存档（localStorage）
const KEY_CHECKIN = "avt_learning_checkins"; // { [date]: true }
const KEY_READ = "avt_learning_read"; // { [itemId]: date }
const KEY_NOTES = "avt_learning_notes"; // Note[]
const KEY_APPLIED = "avt_learning_applied"; // 学以致用处数（点过“去练习”）

export interface LearningNote {
  id: string;
  itemId: string;
  itemTitle: string;
  text: string;
  date: string;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function loadCheckins(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, boolean>>(localStorage.getItem(KEY_CHECKIN), {});
}
export function markCheckin(): string {
  const date = todayStr();
  const map = loadCheckins();
  map[date] = true;
  localStorage.setItem(KEY_CHECKIN, JSON.stringify(map));
  return date;
}
export function hasCheckedInToday(): boolean {
  return !!loadCheckins()[todayStr()];
}

export function loadRead(): Record<string, string> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, string>>(localStorage.getItem(KEY_READ), {});
}
export function markRead(itemId: string): void {
  const map = loadRead();
  map[itemId] = todayStr();
  localStorage.setItem(KEY_READ, JSON.stringify(map));
}
export function isRead(itemId: string): boolean {
  return !!loadRead()[itemId];
}

export function loadNotes(): LearningNote[] {
  if (typeof window === "undefined") return [];
  return safeParse<LearningNote[]>(localStorage.getItem(KEY_NOTES), []);
}
export function addNote(itemId: string, itemTitle: string, text: string): void {
  const notes = loadNotes();
  notes.unshift({ id: Date.now().toString(), itemId, itemTitle, text, date: todayStr() });
  localStorage.setItem(KEY_NOTES, JSON.stringify(notes));
}

export function loadApplied(): number {
  if (typeof window === "undefined") return 0;
  return safeParse<number>(localStorage.getItem(KEY_APPLIED), 0);
}
export function incApplied(): void {
  localStorage.setItem(KEY_APPLIED, String(loadApplied() + 1));
}

// 连续学习天数（基于打卡日期，截止到今天）
export function calcStreak(): number {
  const map = loadCheckins();
  let streak = 0;
  const d = new Date();
  for (;;) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    if (map[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return streak;
}

// ---------------------------------------------------------------- 徽章
export interface Badge {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  unlocked: boolean;
  progress?: string; // 未解锁时的进度提示
}

export function computeBadges(): Badge[] {
  const readCount = Object.keys(loadRead()).length;
  const noteCount = loadNotes().length;
  const applied = loadApplied();
  const totalDays = Object.keys(loadCheckins()).length;
  const streak = calcStreak();

  return [
    {
      id: "seed",
      emoji: "🌱",
      name: "启蒙学者",
      desc: "完成首篇学习",
      unlocked: readCount >= 1,
      progress: `已学 ${readCount} 篇`,
    },
    {
      id: "streak7",
      emoji: "📖",
      name: "坚持达人",
      desc: "连续学习 7 天",
      unlocked: streak >= 7,
      progress: `连续 ${streak} 天`,
    },
    {
      id: "apply",
      emoji: "🎯",
      name: "学以致用",
      desc: "学完去做关联训练",
      unlocked: applied >= 1,
      progress: `已实践 ${applied} 次`,
    },
    {
      id: "note",
      emoji: "📝",
      name: "笔记高手",
      desc: "累计 10 条学习笔记",
      unlocked: noteCount >= 10,
      progress: `已记 ${noteCount} 条`,
    },
    {
      id: "star",
      emoji: "🌟",
      name: "知识之星",
      desc: "累计学习 30 天",
      unlocked: totalDays >= 30,
      progress: `累计 ${totalDays} 天`,
    },
    {
      id: "family",
      emoji: "👨‍👩‍👧",
      name: "成长陪伴者",
      desc: "全家一起参与学习",
      unlocked: readCount >= 5 && noteCount >= 2,
      progress: "多一位家人来学吧",
    },
  ];
}
