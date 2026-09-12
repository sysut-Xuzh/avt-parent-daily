/**
 * AVT 听力测试 —— 题库与评分逻辑（按《AVT听力测试题库完整方案》落实）
 *
 * 设计依据：AVT / LSL 国际通用的「听觉技能发展阶梯」（Erber 模型）四级：
 *   1. 察知 Detection      —— 察觉声音是否存在
 *   2. 分辨 Discrimination —— 分辨声音的异同（大小/高低/长短/一样不一样）
 *   3. 识别 Identification —— 听到词语后指认对应图卡 / 模仿发音
 *   4. 理解 Comprehension  —— 听懂句子 / 指令的含义并作出反应
 *
 * 评分：严格遵循方案「每题 0–4 分（IT-MAIS 量表）」
 *   · 察知级（reaction）：家长观察孩子的自发反应，选 0–4 反应等级
 *   · 分辨/识别/理解（choice）：选对 = 4 分，选错 = 0 分（关卡得分即正确率）
 *   · 识别·模仿（imitation）：家长确认，0 / 2 / 4 分
 * 关卡分 = 该关（各题得分之和 / 满分）× 100；逐级解锁遵循「不可跳级」逻辑。
 */

export type HearingLevelId = "detection" | "discrimination" | "identification" | "comprehension";

import type { VoiceAnalysis } from "@/lib/voice-analysis";

export interface HearingLevel {
  id: HearingLevelId;
  name: string;
  enName: string;
  emoji: string;
  /** 主题色（HEX），用于卡片/进度强调 */
  color: string;
  ageRange: string;
  measures: string;
  desc: string;
  avtRationale: string;
}

export interface ToneStim {
  freq: number;
  volume: number;
  duration: number;
}

export interface HearingOption {
  emoji: string;
  label: string;
}

/** 计分方式 */
export type ScoreType = "reaction" | "choice" | "imitation";

export interface HearingQuestion {
  id: string;
  level: HearingLevelId;
  type: "detection" | "discrimination" | "speech";
  /** 计分方式（决定答题 UI 与得分规则） */
  scoreType: ScoreType;
  /** 子组标签：用于方案中的「分组通过标准」 */
  group?: string;
  /** 给孩子的引导语（界面主提示） */
  prompt: string;
  /** 给家长的小提示 */
  parentTip?: string;
  /** 察知：本题是否真的播放声音（false = 静默控制试次） */
  playsSound?: boolean;
  /** 察知：测试距离 */
  distance?: "1m" | "3m";
  /** 察知：本题要合成的提示音（林氏六音 / 环境声） */
  tone?: ToneStim;
  /** 分辨：左右两个声音刺激 */
  stimA?: ToneStim;
  stimB?: ToneStim;
  /** 识别 / 理解：要朗读的文本 */
  speech?: string;
  /** 选项（choice 用）；reaction / imitation 用统一量表，可不填 */
  options?: HearingOption[];
  correctIndex?: number;
}

// ---------------------------------------------------------------------------
// 0–4 量表
// ---------------------------------------------------------------------------
/** 察知级：IT-MAIS 0–4 反应等级（家长观察） */
export const REACTION_SCALE: { emoji: string; label: string; score: number }[] = [
  { emoji: "😶", label: "完全没有反应", score: 0 },
  { emoji: "🙂", label: "偶尔有轻微反应", score: 1 },
  { emoji: "😐", label: "大约一半时间有反应", score: 2 },
  { emoji: "😊", label: "大部分时间有反应", score: 3 },
  { emoji: "😄", label: "每次都有明显反应", score: 4 },
];

/** 识别·模仿级：家长确认（原型以家长确认替代 AI 语音识别） */
export const IMITATION_SCALE: { emoji: string; label: string; score: number }[] = [
  { emoji: "🙅", label: "没有模仿 / 完全不对", score: 0 },
  { emoji: "🤏", label: "需引导才模仿 / 不清晰", score: 2 },
  { emoji: "👏", label: "清晰模仿出来", score: 4 },
];

// ---------------------------------------------------------------------------
// 四级关卡元数据
// ---------------------------------------------------------------------------
export const HEARING_LEVELS: HearingLevel[] = [
  {
    id: "detection",
    name: "察知",
    enName: "Detection",
    emoji: "👂",
    color: "#6366f1",
    ageRange: "0–2 岁 / 术后初期",
    measures: "察觉声音是否存在（转头、寻找声源、停止动作）",
    desc: "宝宝能不能注意到「有声音了」？这是听觉发展的第一步。",
    avtRationale:
      "AVT 听觉发展阶梯第一级：Auditory Detection。先建立对声音存在的 Awareness，是所有后续听觉学习的基础。",
  },
  {
    id: "discrimination",
    name: "分辨",
    enName: "Discrimination",
    emoji: "🔊",
    color: "#8b5cf6",
    ageRange: "2–4 岁",
    measures: "分辨声音的异同（大/小声、高/低音、长/短音、一样/不一样）",
    desc: "两个声音，宝宝听得出哪里不一样吗？",
    avtRationale:
      "AVT 听觉发展阶梯第二级：Auditory Discrimination。能分辨声学特征的差异，才能进一步识别意义。",
  },
  {
    id: "identification",
    name: "识别",
    enName: "Identification",
    emoji: "🖼️",
    color: "#ec4899",
    ageRange: "3–5 岁",
    measures: "听到词语后，从选项中指认出正确的物品 / 图卡，或模仿发音",
    desc: "「小喇叭说了什么？」宝宝能指对图片、或模仿出来吗？",
    avtRationale:
      "AVT 听觉发展阶梯第三级：Auditory Identification。把听到的声音与意义 / 符号对应起来。",
  },
  {
    id: "comprehension",
    name: "理解",
    enName: "Comprehension",
    emoji: "💡",
    color: "#f59e0b",
    ageRange: "4–6 岁",
    measures: "听懂句子 / 指令的含义，并作出正确反应或选择",
    desc: "「听懂了就指出来！」宝宝明白话里的意思吗？",
    avtRationale:
      "AVT 听觉发展阶梯第四级：Auditory Comprehension。理解语言背后的意图与情境，是沟通的核心。",
  },
];

// ---------------------------------------------------------------------------
// 题库（Erber 四级 · 共 64 题）
// ---------------------------------------------------------------------------
// 林氏六音图卡（用于识别级指认）
const LING6: HearingOption[] = [
  { emoji: "🍦", label: "冰淇淋 /m/" },
  { emoji: "👻", label: "幽灵 /oo/" },
  { emoji: "✈️", label: "飞机 /ah/" },
  { emoji: "🐭", label: "老鼠 /ee/" },
  { emoji: "😴", label: "睡觉 /sh/" },
  { emoji: "🐍", label: "蛇 /s/" },
];
// 林氏六音索引
const LING_IDX = { m: 0, oo: 1, ah: 2, ee: 3, sh: 4, s: 5 };

export const HEARING_QUESTIONS: HearingQuestion[] = [
  // ============================ Level 1 察知（14 题） ============================
  // —— 林氏六音 · 低频（250–500Hz）——
  { id: "d1", level: "detection", type: "detection", scoreType: "reaction", group: "low",
    prompt: "播放 /m/ 音，观察宝宝有没有反应～", parentTip: "看宝宝是否眨眼、停下手里的动作、转头寻找声源。",
    playsSound: true, tone: { freq: 350, volume: 0.6, duration: 0.5 } },
  { id: "d2", level: "detection", type: "detection", scoreType: "reaction", group: "low",
    prompt: "播放 /oo/ 音，宝宝注意到声音了吗？", parentTip: "不要看宝宝、不要给表情提示，纯观察。",
    playsSound: true, tone: { freq: 450, volume: 0.6, duration: 0.5 } },
  // —— 林氏六音 · 中频（1000–2000Hz）——
  { id: "d3", level: "detection", type: "detection", scoreType: "reaction", group: "mid",
    prompt: "播放 /ah/ 音，宝宝有反应吗？", parentTip: "若宝宝看向屏幕，请用手遮挡。",
    playsSound: true, tone: { freq: 1500, volume: 0.6, duration: 0.5 } },
  { id: "d4", level: "detection", type: "detection", scoreType: "reaction", group: "mid",
    prompt: "播放 /ee/ 音，这次有反应吗？", playsSound: true, tone: { freq: 1800, volume: 0.6, duration: 0.5 } },
  // —— 林氏六音 · 高频（4000–8000Hz，言语关键）——
  { id: "d5", level: "detection", type: "detection", scoreType: "reaction", group: "high",
    prompt: "播放 /sh/ 音（高频），宝宝能察觉吗？", parentTip: "高频决定言语清晰度，请特别留意。",
    playsSound: true, tone: { freq: 6000, volume: 0.55, duration: 0.4 } },
  { id: "d6", level: "detection", type: "detection", scoreType: "reaction", group: "high",
    prompt: "播放 /s/ 音（高频），宝宝有反应吗？", parentTip: "高频反应弱会直接影响说话清晰度。",
    playsSound: true, tone: { freq: 7000, volume: 0.5, duration: 0.4 } },
  // —— 环境声（宽频）——
  { id: "d7", level: "detection", type: "detection", scoreType: "reaction", group: "env",
    prompt: "播放「鼓声」，宝宝会被吸引吗？", parentTip: "平台统一合成的标准环境音，避免家长自录音质不一。",
    playsSound: true, tone: { freq: 120, volume: 0.7, duration: 0.35 } },
  { id: "d8", level: "detection", type: "detection", scoreType: "reaction", group: "env",
    prompt: "播放「门铃声」，宝宝注意到吗？", playsSound: true, tone: { freq: 880, volume: 0.6, duration: 0.3 } },
  // —— 静默控制（防止假阳性猜测）——
  { id: "d9", level: "detection", type: "detection", scoreType: "reaction", group: "silence",
    prompt: "（静默试次）本题不播放声音，观察宝宝会不会误反应。",
    parentTip: "若宝宝没有反应 = 真实警觉；若乱反应 = 可能在猜，请选低分。",
    playsSound: false },
  { id: "d10", level: "detection", type: "detection", scoreType: "reaction", group: "silence",
    prompt: "（静默试次）又是安静的一题，宝宝安静吗？", playsSound: false },
  // —— 距离测试 1 米 ——
  { id: "d11", level: "detection", type: "detection", scoreType: "reaction", group: "dist1m",
    prompt: "在 1 米距离播放声音，宝宝还能察觉吗？", parentTip: "请在离宝宝约 1 米处播放。",
    playsSound: true, distance: "1m", tone: { freq: 1500, volume: 0.5, duration: 0.5 } },
  { id: "d12", level: "detection", type: "detection", scoreType: "reaction", group: "dist1m",
    prompt: "再在 1 米处播放一次，宝宝有反应吗？", playsSound: true, distance: "1m",
    tone: { freq: 6000, volume: 0.45, duration: 0.4 } },
  // —— 距离测试 3 米 ——
  { id: "d13", level: "detection", type: "detection", scoreType: "reaction", group: "dist3m",
    prompt: "在 3 米距离播放声音，远距离还能察觉吗？", parentTip: "请在约 3 米处播放，测试远距离听觉。",
    playsSound: true, distance: "3m", tone: { freq: 1500, volume: 0.4, duration: 0.5 } },
  { id: "d14", level: "detection", type: "detection", scoreType: "reaction", group: "dist3m",
    prompt: "再在 3 米处播放一次，宝宝有反应吗？", playsSound: true, distance: "3m",
    tone: { freq: 6000, volume: 0.35, duration: 0.4 } },

  // ============================ Level 2 分辨（16 题） ============================
  // —— 组1：林氏六音配对（低频 vs 高频 / 中频 vs 高频 / 低频 vs 中频）——
  { id: "x1", level: "discrimination", type: "discrimination", scoreType: "choice", group: "pair",
    prompt: "先听左边🅰️，再听右边🅱️。哪个声音更高、更尖？", parentTip: "引导宝宝注意「音调」的不同。",
    stimA: { freq: 350, volume: 0.6, duration: 0.45 }, stimB: { freq: 7000, volume: 0.6, duration: 0.45 },
    options: [ { emoji: "🅰️", label: "左边更高" }, { emoji: "🅱️", label: "右边更高" } ], correctIndex: 1 },
  { id: "x2", level: "discrimination", type: "discrimination", scoreType: "choice", group: "pair",
    prompt: "哪个声音更尖？",
    stimA: { freq: 1500, volume: 0.6, duration: 0.45 }, stimB: { freq: 6000, volume: 0.6, duration: 0.45 },
    options: [ { emoji: "🅰️", label: "左边更高" }, { emoji: "🅱️", label: "右边更高" } ], correctIndex: 1 },
  { id: "x3", level: "discrimination", type: "discrimination", scoreType: "choice", group: "pair",
    prompt: "低音和高音，哪个是右边？",
    stimA: { freq: 450, volume: 0.6, duration: 0.45 }, stimB: { freq: 1800, volume: 0.6, duration: 0.45 },
    options: [ { emoji: "🅰️", label: "左边更高" }, { emoji: "🅱️", label: "右边更高" } ], correctIndex: 1 },
  { id: "x4", level: "discrimination", type: "discrimination", scoreType: "choice", group: "pair",
    prompt: "这两个音，哪个更低沉？",
    stimA: { freq: 350, volume: 0.6, duration: 0.45 }, stimB: { freq: 1500, volume: 0.6, duration: 0.45 },
    options: [ { emoji: "🅰️", label: "左边更低" }, { emoji: "🅱️", label: "右边更低" } ], correctIndex: 0 },
  { id: "x5", level: "discrimination", type: "discrimination", scoreType: "choice", group: "pair",
    prompt: "低音和高音，哪个是左边？",
    stimA: { freq: 450, volume: 0.6, duration: 0.45 }, stimB: { freq: 7000, volume: 0.6, duration: 0.45 },
    options: [ { emoji: "🅰️", label: "左边更低" }, { emoji: "🅱️", label: "右边更低" } ], correctIndex: 0 },
  { id: "x6", level: "discrimination", type: "discrimination", scoreType: "choice", group: "pair",
    prompt: "中音和高音，哪个是右边？",
    stimA: { freq: 1800, volume: 0.6, duration: 0.45 }, stimB: { freq: 6000, volume: 0.6, duration: 0.45 },
    options: [ { emoji: "🅰️", label: "左边更高" }, { emoji: "🅱️", label: "右边更高" } ], correctIndex: 1 },
  // —— 组2：超音段特征（长短 / 大小 / 高低）——
  { id: "x7", level: "discrimination", type: "discrimination", scoreType: "choice", group: "supra",
    prompt: "哪个声音更长一点点？", parentTip: "用 /ah/ 的长短变化引导。",
    stimA: { freq: 600, volume: 0.5, duration: 0.15 }, stimB: { freq: 600, volume: 0.5, duration: 0.6 },
    options: [ { emoji: "🅰️", label: "左边更长" }, { emoji: "🅱️", label: "右边更长" } ], correctIndex: 1 },
  { id: "x8", level: "discrimination", type: "discrimination", scoreType: "choice", group: "supra",
    prompt: "再听一次，哪个更长？",
    stimA: { freq: 600, volume: 0.5, duration: 0.6 }, stimB: { freq: 600, volume: 0.5, duration: 0.15 },
    options: [ { emoji: "🅰️", label: "左边更长" }, { emoji: "🅱️", label: "右边更长" } ], correctIndex: 0 },
  { id: "x9", level: "discrimination", type: "discrimination", scoreType: "choice", group: "supra",
    prompt: "哪个声音更大声？", parentTip: "用同一鼓声不同音量。",
    stimA: { freq: 140, volume: 0.2, duration: 0.35 }, stimB: { freq: 140, volume: 0.85, duration: 0.35 },
    options: [ { emoji: "🅰️", label: "左边更大声" }, { emoji: "🅱️", label: "右边更大声" } ], correctIndex: 1 },
  { id: "x10", level: "discrimination", type: "discrimination", scoreType: "choice", group: "supra",
    prompt: "再听一次，哪个更大声？",
    stimA: { freq: 140, volume: 0.85, duration: 0.35 }, stimB: { freq: 140, volume: 0.2, duration: 0.35 },
    options: [ { emoji: "🅰️", label: "左边更大声" }, { emoji: "🅱️", label: "右边更大声" } ], correctIndex: 0 },
  { id: "x11", level: "discrimination", type: "discrimination", scoreType: "choice", group: "supra",
    prompt: "哪个声音更低、更粗？", parentTip: "用电子音的基频差异。",
    stimA: { freq: 220, volume: 0.6, duration: 0.45 }, stimB: { freq: 880, volume: 0.6, duration: 0.45 },
    options: [ { emoji: "🅰️", label: "左边更低" }, { emoji: "🅱️", label: "右边更低" } ], correctIndex: 0 },
  { id: "x12", level: "discrimination", type: "discrimination", scoreType: "choice", group: "supra",
    prompt: "再听一次，哪个更低？",
    stimA: { freq: 880, volume: 0.6, duration: 0.45 }, stimB: { freq: 220, volume: 0.6, duration: 0.45 },
    options: [ { emoji: "🅰️", label: "左边更低" }, { emoji: "🅱️", label: "右边更低" } ], correctIndex: 1 },
  // —— 组3：相同音控制组（排除随机猜测）——
  { id: "x13", level: "discrimination", type: "discrimination", scoreType: "choice", group: "control",
    prompt: "两个声音一样吗？", parentTip: "相同音，应回答「一样」。若答「不一样」= 0 分（过度反应/猜测）。",
    stimA: { freq: 520, volume: 0.5, duration: 0.4 }, stimB: { freq: 520, volume: 0.5, duration: 0.4 },
    options: [ { emoji: "🟰", label: "一样" }, { emoji: "🔀", label: "不一样" } ], correctIndex: 0 },
  { id: "x14", level: "discrimination", type: "discrimination", scoreType: "choice", group: "control",
    prompt: "再判断：一样还是不一样？",
    stimA: { freq: 520, volume: 0.5, duration: 0.4 }, stimB: { freq: 520, volume: 0.5, duration: 0.4 },
    options: [ { emoji: "🟰", label: "一样" }, { emoji: "🔀", label: "不一样" } ], correctIndex: 0 },
  { id: "x15", level: "discrimination", type: "discrimination", scoreType: "choice", group: "control",
    prompt: "这两个音一样吗？",
    stimA: { freq: 7000, volume: 0.5, duration: 0.35 }, stimB: { freq: 7000, volume: 0.5, duration: 0.35 },
    options: [ { emoji: "🟰", label: "一样" }, { emoji: "🔀", label: "不一样" } ], correctIndex: 0 },
  { id: "x16", level: "discrimination", type: "discrimination", scoreType: "choice", group: "control",
    prompt: "再判断：一样还是不一样？",
    stimA: { freq: 7000, volume: 0.5, duration: 0.35 }, stimB: { freq: 7000, volume: 0.5, duration: 0.35 },
    options: [ { emoji: "🟰", label: "一样" }, { emoji: "🔀", label: "不一样" } ], correctIndex: 0 },

  // ============================ Level 3 识别（18 题） ============================
  // —— 组1：林氏六音指认（6 张图，封闭集）——
  { id: "i1", level: "identification", type: "speech", scoreType: "choice", group: "ling6",
    prompt: "小喇叭说了哪个音？从 6 张图里指出来！", parentTip: "林氏六音是 AVT 最核心的基础指标，务必认真。",
    speech: "m", options: LING6, correctIndex: LING_IDX.m },
  { id: "i2", level: "identification", type: "speech", scoreType: "choice", group: "ling6",
    prompt: "听到哪个音？指出来～", speech: "oo", options: LING6, correctIndex: LING_IDX.oo },
  { id: "i3", level: "identification", type: "speech", scoreType: "choice", group: "ling6",
    prompt: "小喇叭说的音，是哪一张？", speech: "ah", options: LING6, correctIndex: LING_IDX.ah },
  { id: "i4", level: "identification", type: "speech", scoreType: "choice", group: "ling6",
    prompt: "这是哪个音？", speech: "ee", options: LING6, correctIndex: LING_IDX.ee },
  { id: "i5", level: "identification", type: "speech", scoreType: "choice", group: "ling6",
    prompt: "听音指认：小喇叭发的是？", speech: "sh", options: LING6, correctIndex: LING_IDX.sh },
  { id: "i6", level: "identification", type: "speech", scoreType: "choice", group: "ling6",
    prompt: "最后一个音，指出来吧！", speech: "s", options: LING6, correctIndex: LING_IDX.s },
  // —— 组2：词汇识别（封闭集）——
  { id: "i7", level: "identification", type: "speech", scoreType: "choice", group: "word",
    prompt: "小喇叭说了什么水果？指出来！", speech: "苹果",
    options: [ { emoji: "🍎", label: "苹果" }, { emoji: "🍌", label: "香蕉" }, { emoji: "🚗", label: "汽车" }, { emoji: "⚽", label: "球" } ],
    correctIndex: 0 },
  { id: "i8", level: "identification", type: "speech", scoreType: "choice", group: "word",
    prompt: "听到什么车？指出来！", speech: "汽车",
    options: [ { emoji: "🚌", label: "公交车" }, { emoji: "🚗", label: "汽车" }, { emoji: "✈️", label: "飞机" }, { emoji: "🚲", label: "自行车" } ],
    correctIndex: 1 },
  { id: "i9", level: "identification", type: "speech", scoreType: "choice", group: "word",
    prompt: "谁在和你招手？", speech: "小熊",
    options: [ { emoji: "🐻", label: "小熊" }, { emoji: "🐼", label: "熊猫" }, { emoji: "🐨", label: "考拉" }, { emoji: "🐰", label: "小兔" } ],
    correctIndex: 0 },
  { id: "i10", level: "identification", type: "speech", scoreType: "choice", group: "word",
    prompt: "天黑了，天上有什么？", speech: "星星",
    options: [ { emoji: "⭐", label: "星星" }, { emoji: "🌙", label: "月亮" }, { emoji: "☀️", label: "太阳" }, { emoji: "🌈", label: "彩虹" } ],
    correctIndex: 0 },
  // —— 组3：韵母识别 ——
  { id: "i11", level: "identification", type: "speech", scoreType: "choice", group: "final",
    prompt: "听到哪个韵母？指出来～", speech: "a",
    options: [ { emoji: "👄", label: "a" }, { emoji: "⭕", label: "o" }, { emoji: "🥚", label: "e" }, { emoji: "🧊", label: "i" } ],
    correctIndex: 0 },
  { id: "i12", level: "identification", type: "speech", scoreType: "choice", group: "final",
    prompt: "这是哪个韵母？", speech: "o",
    options: [ { emoji: "👄", label: "a" }, { emoji: "⭕", label: "o" }, { emoji: "🥚", label: "e" }, { emoji: "🧊", label: "i" } ],
    correctIndex: 1 },
  { id: "i13", level: "identification", type: "speech", scoreType: "choice", group: "final",
    prompt: "听音选韵母：", speech: "e",
    options: [ { emoji: "👄", label: "a" }, { emoji: "⭕", label: "o" }, { emoji: "🥚", label: "e" }, { emoji: "🧊", label: "i" } ],
    correctIndex: 2 },
  { id: "i14", level: "identification", type: "speech", scoreType: "choice", group: "final",
    prompt: "最后一个韵母，指出来！", speech: "i",
    options: [ { emoji: "👄", label: "a" }, { emoji: "⭕", label: "o" }, { emoji: "🥚", label: "e" }, { emoji: "🧊", label: "i" } ],
    correctIndex: 3 },
  // —— 组4：模仿测试（家长确认，0/2/4）——
  { id: "i15", level: "identification", type: "speech", scoreType: "imitation", group: "imitate",
    prompt: "播放 /m/，让宝宝跟着模仿发音～", parentTip: "宝宝模仿后，由您确认清晰程度（最终由治疗师复核）。",
    speech: "m" },
  { id: "i16", level: "identification", type: "speech", scoreType: "imitation", group: "imitate",
    prompt: "播放 /ah/，鼓励宝宝模仿～", speech: "ah" },
  { id: "i17", level: "identification", type: "speech", scoreType: "imitation", group: "imitate",
    prompt: "播放 /ee/，让宝宝跟着学～", speech: "ee" },
  { id: "i18", level: "identification", type: "speech", scoreType: "imitation", group: "imitate",
    prompt: "播放 /s/（像蛇叫），宝宝能模仿吗？", speech: "s" },

  // ============================ Level 4 理解（16 题） ============================
  // —— 组1：一步指令 ——
  { id: "c1", level: "comprehension", type: "speech", scoreType: "choice", group: "onestep",
    prompt: "听懂了就做出来～", speech: "摸摸头",
    options: [ { emoji: "🤚", label: "摸头" }, { emoji: "👏", label: "拍手" }, { emoji: "🧍", label: "站起来" } ],
    correctIndex: 0 },
  { id: "c2", level: "comprehension", type: "speech", scoreType: "choice", group: "onestep",
    prompt: "妈妈说什么就做什么！", speech: "拍拍手",
    options: [ { emoji: "🤚", label: "摸头" }, { emoji: "👏", label: "拍手" }, { emoji: "🧍", label: "站起来" } ],
    correctIndex: 1 },
  { id: "c3", level: "comprehension", type: "speech", scoreType: "choice", group: "onestep",
    prompt: "听指令：", speech: "站起来",
    options: [ { emoji: "🤚", label: "摸头" }, { emoji: "👏", label: "拍手" }, { emoji: "🧍", label: "站起来" } ],
    correctIndex: 2 },
  { id: "c4", level: "comprehension", type: "speech", scoreType: "choice", group: "onestep",
    prompt: "听指令：", speech: "坐下",
    options: [ { emoji: "🪑", label: "坐下" }, { emoji: "🏃", label: "跑一跑" }, { emoji: "💤", label: "睡觉" } ],
    correctIndex: 0 },
  // —— 组2：两步指令 ——
  { id: "c5", level: "comprehension", type: "speech", scoreType: "choice", group: "twostep",
    prompt: "两步指令，按顺序做哦～", speech: "先拍手，再摸头",
    options: [ { emoji: "1️⃣👏2️⃣🤚", label: "先拍手再摸头" }, { emoji: "1️⃣🤚2️⃣👏", label: "先摸头再拍手" }, { emoji: "👏", label: "只拍手" } ],
    correctIndex: 0 },
  { id: "c6", level: "comprehension", type: "speech", scoreType: "choice", group: "twostep",
    prompt: "听好两步：", speech: "拿红色的球，给妈妈",
    options: [ { emoji: "🔴⚽🤱", label: "拿红球给妈妈" }, { emoji: "🔵⚽🤱", label: "拿蓝球给妈妈" }, { emoji: "🔴⚽", label: "只拿红球" } ],
    correctIndex: 0 },
  // —— 组3：选择性问题 ——
  { id: "c7", level: "comprehension", type: "speech", scoreType: "choice", group: "selective",
    prompt: "哪个是苹果？指出来～", speech: "哪个是苹果？",
    options: [ { emoji: "🍎", label: "苹果" }, { emoji: "🍌", label: "香蕉" }, { emoji: "🚗", label: "汽车" } ],
    correctIndex: 0 },
  { id: "c8", level: "comprehension", type: "speech", scoreType: "choice", group: "selective",
    prompt: "指一指睡觉的小动物。", speech: "指一指睡觉的图片",
    options: [ { emoji: "😴", label: "睡觉" }, { emoji: "🏃", label: "跑步" }, { emoji: "🍽️", label: "吃饭" } ],
    correctIndex: 0 },
  { id: "c9", level: "comprehension", type: "speech", scoreType: "choice", group: "selective",
    prompt: "谁在吃东西？", speech: "谁在吃东西？",
    options: [ { emoji: "🐶🍎", label: "小狗吃苹果" }, { emoji: "🐱😴", label: "小猫睡觉" }, { emoji: "🐰🏃", label: "小兔跑步" } ],
    correctIndex: 0 },
  { id: "c10", level: "comprehension", type: "speech", scoreType: "choice", group: "selective",
    prompt: "哪辆是汽车？", speech: "哪辆是汽车？",
    options: [ { emoji: "🚌", label: "公交车" }, { emoji: "🚗", label: "汽车" }, { emoji: "✈️", label: "飞机" } ],
    correctIndex: 1 },
  // —— 组4：功能性问题 ——
  { id: "c11", level: "comprehension", type: "speech", scoreType: "choice", group: "functional",
    prompt: "想一想，你用什么喝水？", speech: "你用什么喝水？",
    options: [ { emoji: "🥛", label: "杯子" }, { emoji: "🍚", label: "碗" }, { emoji: "📖", label: "书" } ],
    correctIndex: 0 },
  { id: "c12", level: "comprehension", type: "speech", scoreType: "choice", group: "functional",
    prompt: "饿了要吃什么？", speech: "饿了要吃什么？",
    options: [ { emoji: "🍞", label: "面包" }, { emoji: "🧸", label: "玩具" }, { emoji: "👟", label: "鞋子" } ],
    correctIndex: 0 },
  // —— 组5：简单问句（是/否）——
  { id: "c13", level: "comprehension", type: "speech", scoreType: "choice", group: "yesno",
    prompt: "这是红色的球吗？", speech: "这是红色的球吗？",
    options: [ { emoji: "✅", label: "是" }, { emoji: "❌", label: "不是" } ], correctIndex: 0 },
  { id: "c14", level: "comprehension", type: "speech", scoreType: "choice", group: "yesno",
    prompt: "小狗在跑还是在跳？", speech: "小狗在跑还是在跳？",
    options: [ { emoji: "🏃", label: "在跑" }, { emoji: "🦘", label: "在跳" } ], correctIndex: 0 },
  // —— 组6：故事理解 ——
  { id: "c15", level: "comprehension", type: "speech", scoreType: "choice", group: "story",
    prompt: "听个小故事，然后回答问题～", parentTip: "故事会先朗读 3–5 句，再提问关键信息。",
    speech: "小熊肚子饿了，它走进树林，找到了一罐蜂蜜，开心地吃掉了。小熊去了哪里？",
    options: [ { emoji: "🌳", label: "树林" }, { emoji: "🏠", label: "家里" }, { emoji: "🏫", label: "学校" } ],
    correctIndex: 0 },
  { id: "c16", level: "comprehension", type: "speech", scoreType: "choice", group: "story",
    prompt: "再听一个故事～", speech: "小猫把毛线球滚到了床底下，怎么也够不着，急得喵喵叫。谁吃了蜂蜜？",
    options: [ { emoji: "🐻", label: "小熊" }, { emoji: "🐱", label: "小猫" }, { emoji: "🐶", label: "小狗" } ],
    correctIndex: 0 },
];

// 每关满分（题数 × 4），用于换算百分比
const LEVEL_MAX: Record<HearingLevelId, number> = (() => {
  const m: Record<HearingLevelId, number> = { detection: 0, discrimination: 0, identification: 0, comprehension: 0 };
  for (const q of HEARING_QUESTIONS) m[q.level] += 4;
  return m;
})();

// ---------------------------------------------------------------------------
// 评分与建议
// ---------------------------------------------------------------------------
export interface HearingResults {
  /** 各关卡得分（0–100） */
  scores: Record<HearingLevelId, number>;
  /** 各关卡子组得分（0–100），key = `${level}:${group}` */
  subgroup: Record<string, number>;
  /** 总得分（0–100，四关平均） */
  totalPct: number;
  /** 各关卡题数 */
  counts: Record<HearingLevelId, number>;
  /** 各关卡是否通过（满足全部通过标准） */
  passed: Record<HearingLevelId, boolean>;
  /** 各关卡未通过原因（中文） */
  failReasons: Record<HearingLevelId, string[]>;
}

/**
 * 根据逐题 0–4 得分（answers: questionId -> 0..4）计算关卡分、子组分、通过与总评。
 */
export function computeResults(answers: Record<string, number>): HearingResults {
  const scores: Record<HearingLevelId, number> = { detection: 0, discrimination: 0, identification: 0, comprehension: 0 };
  const counts: Record<HearingLevelId, number> = { detection: 0, discrimination: 0, identification: 0, comprehension: 0 };
  const sum: Record<HearingLevelId, number> = { detection: 0, discrimination: 0, identification: 0, comprehension: 0 };
  // 子组累计： key `${level}:${group}` -> { got, max }
  const sub: Record<string, { got: number; max: number }> = {};

  for (const q of HEARING_QUESTIONS) {
    const v = answers[q.id];
    if (typeof v !== "number") continue;
    counts[q.level] += 1;
    sum[q.level] += v;
    if (q.group) {
      const k = `${q.level}:${q.group}`;
      if (!sub[k]) sub[k] = { got: 0, max: 0 };
      sub[k].got += v;
      sub[k].max += 4;
    }
  }

  (Object.keys(scores) as HearingLevelId[]).forEach((k) => {
    scores[k] = counts[k] > 0 ? Math.round((sum[k] / (counts[k] * 4)) * 100) : 0;
  });

  const subgroup: Record<string, number> = {};
  for (const k of Object.keys(sub)) {
    subgroup[k] = sub[k].max > 0 ? Math.round((sub[k].got / sub[k].max) * 100) : 0;
  }

  const { passed, failReasons } = evaluatePass(scores, subgroup, counts);
  const totalPct = Math.round(
    (Object.keys(scores) as HearingLevelId[]).reduce((s, k) => s + scores[k], 0) / 4
  );
  return { scores, subgroup, totalPct, counts, passed, failReasons };
}

/** 方案 §2.4 / §3.4 / §4.4 / §5.4 的逐级通过标准 */
function evaluatePass(
  scores: Record<HearingLevelId, number>,
  subgroup: Record<string, number>,
  counts: Record<HearingLevelId, number>
): { passed: Record<HearingLevelId, boolean>; failReasons: Record<HearingLevelId, string[]> } {
  const passed: Record<HearingLevelId, boolean> = { detection: false, discrimination: false, identification: false, comprehension: false };
  const failReasons: Record<HearingLevelId, string[]> = { detection: [], discrimination: [], identification: [], comprehension: [] };

  const totalOk = (k: HearingLevelId) => scores[k] >= 75;
  const subOk = (k: string, min: number) => (subgroup[k] ?? 0) >= min;

  // 察知：总分≥75% 且 高频≥75% 且 静默控制≥75%
  if (!totalOk("detection")) failReasons.detection.push("察知总分未达 75%");
  if (!subOk("detection:high", 75)) failReasons.detection.push("高频音（/sh/ /s/）反应不足，需加强高频暴露");
  if (!subOk("detection:silence", 75)) failReasons.detection.push("静默控制未达标，可能存在猜测反应");
  passed.detection = failReasons.detection.length === 0 && counts.detection > 0;

  // 分辨：总分≥75% 且 超音段≥75% 且 控制组全对（≥75%）
  if (!totalOk("discrimination")) failReasons.discrimination.push("分辨总分未达 75%");
  if (!subOk("discrimination:supra", 75)) failReasons.discrimination.push("超音段特征（长短/大小/高低）分辨不足");
  if (!subOk("discrimination:control", 75)) failReasons.discrimination.push("相同音控制组未全对，存在过度反应/猜测");
  passed.discrimination = failReasons.discrimination.length === 0 && counts.discrimination > 0;

  // 识别：总分≥75% 且 林氏六音全对(100%) 且 词汇≥87.5% 且 模仿均分≥50%
  if (!totalOk("identification")) failReasons.identification.push("识别总分未达 75%");
  if (!subOk("identification:ling6", 100)) failReasons.identification.push("林氏六音指认未全对（AVT 核心基础）");
  if (!subOk("identification:word", 87.5)) failReasons.identification.push("词汇识别偏弱（目标 ≥87.5%）");
  if (!subOk("identification:imitate", 50)) failReasons.identification.push("模仿发音均分偏低（目标 ≥50%）");
  passed.identification = failReasons.identification.length === 0 && counts.identification > 0;

  // 理解：总分≥75% 且 一步指令全对(100%) 且 故事≥75%
  if (!totalOk("comprehension")) failReasons.comprehension.push("理解总分未达 75%");
  if (!subOk("comprehension:onestep", 100)) failReasons.comprehension.push("一步指令未全对（基础理解须稳固）");
  if (!subOk("comprehension:story", 75)) failReasons.comprehension.push("故事理解偏弱（目标 ≥75%）");
  passed.comprehension = failReasons.comprehension.length === 0 && counts.comprehension > 0;

  return { passed, failReasons };
}

export interface Interpretation {
  label: string;
  text: string;
}

/** 总分解读（结合四级通过情况） */
export function getInterpretation(totalPct: number, passed: Record<HearingLevelId, boolean>): Interpretation {
  const passedCount = (Object.keys(passed) as HearingLevelId[]).filter((k) => passed[k]).length;
  if (passedCount === 4)
    return { label: "四级全通过 🌟", text: "察知→分辨→识别→理解均已达标，听觉能力发展均衡且良好，保持日常训练即可。" };
  if (totalPct >= 85)
    return { label: "优秀 🌟", text: "四项听觉能力发展均衡且良好，个别层级可针对性再加强。" };
  if (totalPct >= 70)
    return { label: "良好 👍", text: "整体表现不错，未通过的层级可针对性地再加强。" };
  if (totalPct >= 50)
    return { label: "需加强 💪", text: "部分层级还需要更多听觉输入，建议增加对应小游戏。" };
  return { label: "建议强化 🩺", text: "多项能力偏弱，建议与治疗师沟通，增加一对一训练频次。" };
}

/** 单关卡训练建议（未通过 or 得分 < 70 时给出，依据 AVT 策略） */
export function getSuggestion(level: HearingLevelId, pct: number): string | null {
  if (pct >= 70) return null;
  const map: Record<HearingLevelId, string> = {
    detection:
      "多做「声音觉察」游戏：在家制造多样声音（摇铃、敲鼓、关门声），训练宝宝转头找声源，特别加强高频 /sh/ /s/ 的暴露。",
    discrimination:
      "玩「一样不一样」：用大/小声、高/低音引导宝宝分辨声学差异，先从最明显的对比开始，再过渡到细微变化。",
    identification:
      "坚持「听觉先行」：先说物品名再拿出实物，做听音选物的小游戏，每天 5 分钟；模仿题多鼓励宝宝跟读。",
    comprehension:
      "从一步指令起步（「把球给妈妈」），逐步到两步指令，配合真实情境理解语意。",
  };
  return map[level];
}

/** 关卡能力等级标签（方案 §6.1） */
export function getLevelGrade(level: HearingLevelId, pct: number): { tag: string; emoji: string } {
  // 简化为三档：<50 需关注 / 50–74 稳步发展 / ≥75 准备升级或优秀
  if (pct >= 75) return { tag: "准备升级 / 优秀", emoji: "🟢" };
  if (pct >= 50) return { tag: "稳步发展", emoji: "🟡" };
  return { tag: "需要关注", emoji: "🔴" };
}

// ---------------------------------------------------------------------------
// 中国常模对照（方案 §7，原型以人工耳蜗·适应期为演示基准）
// ---------------------------------------------------------------------------
export type DeviceType = "ci" | "ha"; // 人工耳蜗 / 助听器
export type RehabStage = "init" | "adapt" | "improve" | "fusion" | "mature";

/** 各设备×阶段的四级目标（百分比），null = 该阶段暂不要求（—） */
export const NORMS: Record<DeviceType, Record<RehabStage, Record<HearingLevelId, number | null>>> = {
  ci: {
    init: { detection: 62, discrimination: null, identification: null, comprehension: null },
    adapt: { detection: 100, discrimination: 63, identification: null, comprehension: null },
    improve: { detection: 100, discrimination: 100, identification: 69, comprehension: null },
    fusion: { detection: 100, discrimination: 100, identification: 100, comprehension: 70 },
    mature: { detection: 100, discrimination: 100, identification: 100, comprehension: 86 },
  },
  ha: {
    init: { detection: 71, discrimination: null, identification: null, comprehension: null },
    adapt: { detection: 100, discrimination: 70, identification: null, comprehension: null },
    improve: { detection: 100, discrimination: 100, identification: 76, comprehension: 55 },
    fusion: { detection: 100, discrimination: 100, identification: 100, comprehension: 78 },
    mature: { detection: 100, discrimination: 100, identification: 100, comprehension: 86 },
  },
};

export const STAGE_LABEL: Record<RehabStage, string> = {
  init: "初配期（0–3 月）",
  adapt: "适应期（3–6 月）",
  improve: "提升期（6–12 月）",
  fusion: "融合期（12–24 月）",
  mature: "成熟期（24 月+）",
};

export const DEVICE_LABEL: Record<DeviceType, string> = {
  ci: "人工耳蜗植入",
  ha: "助听器佩戴",
};

/** 演示基准（与用户当前康复阶段一致：适应期 · 人工耳蜗） */
export const DEMO_DEVICE: DeviceType = "ci";
export const DEMO_STAGE: RehabStage = "adapt";

/** 同龄健听参考（方案 §7.3，按年龄的预期水平文字） */
export const PEER_REFERENCE: { age: string; level: string }[] = [
  { age: "6–12 月", level: "Level 1 满分（对所有声音有稳定反应）" },
  { age: "12–18 月", level: "Level 2 满分（能分辨不同声音）" },
  { age: "18–24 月", level: "Level 3 满分（能识别常见词汇并模仿）" },
  { age: "24–36 月", level: "Level 4 总分 ≥ 50（两步指令/简单问答）" },
  { age: "36–48 月", level: "Level 4 满分（听懂短故事并答关键问题）" },
];

// ---------------------------------------------------------------------------
// 成长记录（localStorage）
// ---------------------------------------------------------------------------
export interface HearingTestRecord {
  id: string;
  date: string; // ISO
  totalPct: number;
  scores: Record<HearingLevelId, number>;
  passed: Record<HearingLevelId, boolean>;
  /** 模仿题的本地声线参与度分析（原始音频不上传，仅存结构化指标） */
  engagements?: Record<string, VoiceAnalysis>;
}

const STORAGE_KEY = "avt_hearing_tests_v1";

export function saveTestRecord(record: HearingTestRecord): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list: HearingTestRecord[] = raw ? JSON.parse(raw) : [];
    list.unshift(record);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
  } catch {
    /* 忽略存储异常（隐私模式等） */
  }
}

export function loadTestRecords(): HearingTestRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as HearingTestRecord[]) : [];
    // 兼容旧记录（无 passed 字段）
    return list.map((r) => ({
      ...r,
      passed: r.passed ?? {
        detection: (r.scores?.detection ?? 0) >= 75,
        discrimination: (r.scores?.discrimination ?? 0) >= 75,
        identification: (r.scores?.identification ?? 0) >= 75,
        comprehension: (r.scores?.comprehension ?? 0) >= 75,
      },
    }));
  } catch {
    return [];
  }
}
