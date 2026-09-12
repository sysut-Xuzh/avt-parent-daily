// AVT 32 个基本训练活动类型定义
// 基于 AG Bell Academy 国际规范手册，每个类型用动画做代表示范
// 动画按「活动类型」关联（目标词只是卡片上标注的学习内容，不影响动画）
//
// 动画文件命名规范：/animations/{activityId}.mp4
// 已存在的 4 个演示动画（命名等待/听觉轰炸/听觉先行/平行说话）映射到对应活动，
// 其余 28 个按规范预留路径，制作好文件放入 public/animations/ 即自动生效。

export interface TrainingActivity {
  id: string;          // 唯一标识，如 "sound-detection"
  no: number;          // 编号 01-32
  name: string;        // 类型名称，如 "声音觉察"
  category: string;    // 所属模块
  description: string; // 简要说明
  animFile?: string;   // 代表动画文件（相对 public/animations）
  speechText?: string; // 动画中的台词示范
}

const anim = (file: string, speech: string) => ({ animFile: file, speechText: speech });

// 现有演示动画文件（4 个）映射到最匹配的活动
// 新命名文件（{activityId}.mp4）优先，旧拼音文件作 fallback
const DEMO_ANIMS = {
  // 命名等待（苹果）→ wait-time.mp4，旧文件作 fallback
  mingming: anim("/animations/wait-time.mp4", "拿起苹果，说「苹果」，等一等"),
  // 听觉轰炸（狗）→ auditory-bombardment.mp4，旧文件作 fallback
  hongzha: anim("/animations/auditory-bombardment.mp4", "汪汪，汪汪，汪汪"),
  // 听觉先行（水）→ audition-first.mp4，旧文件作 fallback
  xianxing: anim("/animations/audition-first.mp4", "先听水声，哗啦啦，再出示水"),
  // 平行说话（晚安）→ bedtime-routine.mp4，旧文件作 fallback
  pingxing: anim("/animations/bedtime-routine.mp4", "月亮在天上，星星眨眼睛"),
};

// 旧拼音动画文件（work Buddy 新文件未就位时的 fallback）
export const LEGACY_ANIMS: Record<string, string> = {
  "wait-time": "/animations/mingming-dengdai-pingguo.mp4",
  "auditory-bombardment": "/animations/tingjue-hongzha-gou.mp4",
  "audition-first": "/animations/tingjue-xianxing-shui.mp4",
  "bedtime-routine": "/animations/pingxing-shuohua-wanan.mp4",
};

// 新动画统一命名规范：/animations/{activityId}.mp4
// 台词从 task-speech.ts 对应条目提取

export const TRAINING_ACTIVITIES: TrainingActivity[] = [
  // ===== 一、听觉技能训练（4条）=====
  {
    id: "sound-detection", no: 1, name: "声音觉察", category: "听觉技能",
    description: "培养孩子感知声音存在与否的能力（Erber第一级）",
    ...anim("/animations/sound-detection.mp4", "叮铃铃，听！"),
  },
  {
    id: "sound-discrimination", no: 2, name: "声音分辨", category: "听觉技能",
    description: "判断两个声音是否相同，提升听觉精细辨别力",
    ...anim("/animations/sound-discrimination.mp4", "哞——嗡——，一样吗？"),
  },
  {
    id: "sound-identification", no: 3, name: "声音识别", category: "听觉技能",
    description: "从多个选项中识别并指出目标声音对应物品",
    ...anim("/animations/sound-identification.mp4", "给我勺子"),
  },
  {
    id: "sound-comprehension", no: 4, name: "声音理解", category: "听觉技能",
    description: "理解并执行多步骤听觉指令，听觉层级最高级",
    ...anim("/animations/sound-comprehension.mp4", "先拿红球，再放进篮子"),
  },

  // ===== 二、核心AVT策略（8条）=====
  {
    id: "audition-first", no: 5, name: "听觉优先", category: "核心策略",
    description: "先听再看，建立声音-实物直接神经联结",
    ...DEMO_ANIMS.xianxing,
  },
  {
    id: "auditory-sandwich", no: 6, name: "听觉三明治", category: "核心策略",
    description: "听→看→再听，视觉辅助后立即撤除",
    ...anim("/animations/auditory-sandwich.mp4", "球，听——看——再听"),
  },
  {
    id: "acoustic-highlighting", no: 7, name: "声学强调", category: "核心策略",
    description: "通过音量、音高、语速突出目标词汇",
    ...anim("/animations/acoustic-highlighting.mp4", "红——色——的球"),
  },
  {
    id: "wait-time", no: 8, name: "等待时间", category: "核心策略",
    description: "停顿3-5秒等孩子回应，提升回应质量",
    ...DEMO_ANIMS.mingming,
  },
  {
    id: "auditory-bombardment", no: 9, name: "听觉轰炸", category: "核心策略",
    description: "短时间内大量重复目标音词汇",
    ...DEMO_ANIMS.hongzha,
  },
  {
    id: "expansion", no: 10, name: "扩展表达", category: "核心策略",
    description: "在孩子表达基础上添加词汇语法扩展句子",
    ...anim("/animations/expansion.mp4", "红色的球"),
  },
  {
    id: "sabotage", no: 11, name: "破坏期待", category: "核心策略",
    description: "制造与预期不符情境，激发主动表达",
    ...anim("/animations/sabotage.mp4", "要水！"),
  },
  {
    id: "repair-communication", no: 12, name: "修复沟通", category: "核心策略",
    description: "培养孩子主动确认和修复沟通中断",
    ...anim("/animations/repair-communication.mp4", "你听到了什么？再说一遍"),
  },

  // ===== 三、日常生活常规（6条）=====
  {
    id: "morning-routine", no: 13, name: "晨起常规", category: "日常常规",
    description: "穿衣活动融入语言输入和顺序指令",
    ...anim("/animations/morning-routine.mp4", "先穿红色袜子"),
  },
  {
    id: "mealtime", no: 14, name: "用餐时间", category: "日常常规",
    description: "食物选择+描述味道质地，丰富词汇",
    ...anim("/animations/mealtime.mp4", "要香蕉还是饼干？"),
  },
  {
    id: "bath-time", no: 15, name: "洗澡时间", category: "日常常规",
    description: "动作描述+拟声词，多感官语言输入",
    ...anim("/animations/bath-time.mp4", "洗头发，搓搓搓，水哗啦啦"),
  },
  {
    id: "bedtime-routine", no: 16, name: "睡前常规", category: "日常常规",
    description: "绘本共读+晚安仪式，安静环境深度输入",
    ...DEMO_ANIMS.pingxing,
  },
  {
    id: "cleanup-time", no: 17, name: "收拾玩具", category: "日常常规",
    description: "多步骤指令+分类概念训练",
    ...anim("/animations/cleanup-time.mp4", "积木放红盒，车放蓝盒"),
  },
  {
    id: "going-out", no: 18, name: "出门活动", category: "日常常规",
    description: "环境声音识别（交通工具、自然声音）",
    ...anim("/animations/going-out.mp4", "听，警车的笛声，呜——呜——"),
  },

  // ===== 四、游戏互动（6条）=====
  {
    id: "peekaboo", no: 19, name: "躲猫猫", category: "游戏互动",
    description: "声音与人物出现的预期联结训练",
    ...anim("/animations/peekaboo.mp4", "不见了，在这里！"),
  },
  {
    id: "pretend-play", no: 20, name: "过家家", category: "游戏互动",
    description: "角色扮演中练习对话和叙事",
    ...anim("/animations/pretend-play.mp4", "饿了，吃饭饭"),
  },
  {
    id: "treasure-hunt", no: 21, name: "寻宝游戏", category: "游戏互动",
    description: "听觉线索引导寻找物品",
    ...anim("/animations/treasure-hunt.mp4", "它在沙发后面"),
  },
  {
    id: "singing-movement", no: 22, name: "唱歌律动", category: "游戏互动",
    description: "儿歌+动作，增强记忆和节奏感",
    ...anim("/animations/singing-movement.mp4", "洗洗手，洗洗手"),
  },
  {
    id: "shared-reading", no: 23, name: "绘本共读", category: "游戏互动",
    description: "互动式阅读，培养叙事理解",
    ...anim("/animations/shared-reading.mp4", "小狗在做什么？跑！"),
  },
  {
    id: "blowing-activities", no: 24, name: "吹泡泡", category: "游戏互动",
    description: "呼吸控制+口腔肌肉，为发音打基础",
    ...anim("/animations/blowing-activities.mp4", "呼——泡泡飞出来了"),
  },

  // ===== 五、设备管理（3条）=====
  {
    id: "ling6-check", no: 25, name: "Ling-6检查", category: "设备管理",
    description: "每日6音检查确认设备工作正常",
    ...anim("/animations/ling6-check.mp4", "m—ah—oo—ee—sh—s"),
  },
  {
    id: "device-wearing", no: 26, name: "设备佩戴", category: "设备管理",
    description: "建立全天佩戴习惯，正面情感联结",
    ...anim("/animations/device-wearing.mp4", "戴上小耳朵，听妈妈说话"),
  },
  {
    id: "device-troubleshooting", no: 27, name: "设备排查", category: "设备管理",
    description: "快速排查电池、导线等常见故障",
    ...anim("/animations/device-troubleshooting.mp4", "没声音？换电池，好了！"),
  },

  // ===== 六、家长沟通技巧（5条）=====
  {
    id: "face-to-face", no: 28, name: "面对面交流", category: "家长技巧",
    description: "视线平齐，最大化多感官输入",
    ...anim("/animations/face-to-face.mp4", "看妈妈的眼睛，听妈妈说"),
  },
  {
    id: "reduce-noise", no: 29, name: "减少背景噪音", category: "家长技巧",
    description: "创造低噪音环境，减少听觉竞争",
    ...anim("/animations/reduce-noise.mp4", "现在安静了，听故事"),
  },
  {
    id: "self-talk", no: 30, name: "自我谈话", category: "家长技巧",
    description: "家长描述自己正在做的事，提供语言模型",
    ...anim("/animations/self-talk.mp4", "妈妈在切苹果"),
  },
  {
    id: "parallel-talk", no: 31, name: "平行谈话", category: "家长技巧",
    description: "描述孩子正在做的事，增强自我意识",
    ...anim("/animations/parallel-talk.mp4", "你在搭积木，高高的塔"),
  },
  {
    id: "praise-effort", no: 32, name: "正向激励", category: "家长技巧",
    description: "具体真诚的表扬，强化听觉注意力",
    ...anim("/animations/praise-effort.mp4", "太棒了！你听到了！"),
  },
];

// 通用占位动画（无专属动画的类型使用）
export const FALLBACK_ANIM = {
  animFile: "/animations/tingjue-xianxing-shui.mp4",
  speechText: "先听，再看，耐心等待宝宝回应",
};

// 按 id 查找活动
export function getActivityById(id: string): TrainingActivity | undefined {
  return TRAINING_ACTIVITIES.find((a) => a.id === id);
}

// 获取活动的动画文件：
// 新命名文件优先（{activityId}.mp4）；旧拼音文件作 fallback；都没有用通用占位
// 注意：只做路径解析，不检查文件是否真的存在（视频 404 时 AnimationModal 会自动降级）
export function getActivityAnim(id: string): { animFile: string; speechText: string } {
  const act = getActivityById(id);
  if (act?.animFile && act.speechText) {
    return { animFile: act.animFile, speechText: act.speechText };
  }
  // 旧拼音文件 fallback
  const legacy = id ? LEGACY_ANIMS[id] : undefined;
  if (legacy && act?.speechText) {
    return { animFile: legacy, speechText: act.speechText };
  }
  return FALLBACK_ANIM;
}

// 列出所有活动的动画文件状态（用于诊断：哪些已有文件、哪些待制作）
export function listAnimStatus(): { id: string; no: number; name: string; animFile: string; hasFile: boolean }[] {
  return TRAINING_ACTIVITIES.map((a) => ({
    id: a.id,
    no: a.no,
    name: a.name,
    animFile: a.animFile || FALLBACK_ANIM.animFile,
    hasFile: Boolean(a.animFile && a.speechText),
  }));
}

// ============================================================
// 32 个活动的卡片展示配置（角色/颜色/分步提示/小贴士）
// 供 TaskCard 动态读取，替代硬编码的 4 策略配置
// ============================================================

export interface ActivityDisplay {
  character: string;      // 角色 emoji
  characterName: string;  // 角色名字
  color: string;          // 背景色（如 bg-blue-50）
  borderColor: string;    // 边框色（如 border-blue-200）
  textColor: string;      // 文字色（如 text-blue-600）
  badgeColor: string;     // 标签色
  tip: string;            // 小贴士
  animationSteps: string[]; // 分步提示（对应动画分镜）
}

// 模块级默认角色与颜色
const MODULE_DEFAULT: Record<string, Pick<ActivityDisplay, "character" | "characterName" | "color" | "borderColor" | "textColor" | "badgeColor">> = {
  "听觉技能": { character: "🦉", characterName: "博士", color: "bg-blue-50", borderColor: "border-blue-200", textColor: "text-blue-600", badgeColor: "bg-blue-50 text-blue-600" },
  "核心策略": { character: "🐰", characterName: "听听", color: "bg-orange-50", borderColor: "border-orange-200", textColor: "text-orange-600", badgeColor: "bg-orange-50 text-orange-600" },
  "日常常规": { character: "🐱", characterName: "喵喵", color: "bg-green-50", borderColor: "border-green-200", textColor: "text-green-600", badgeColor: "bg-green-50 text-green-600" },
  "游戏互动": { character: "🐶", characterName: "汪汪", color: "bg-purple-50", borderColor: "border-purple-200", textColor: "text-purple-600", badgeColor: "bg-purple-50 text-purple-600" },
  "设备管理": { character: "🐻", characterName: "熊宝", color: "bg-cyan-50", borderColor: "border-cyan-200", textColor: "text-cyan-600", badgeColor: "bg-cyan-50 text-cyan-600" },
  "家长技巧": { character: "🦊", characterName: "灵灵", color: "bg-pink-50", borderColor: "border-pink-200", textColor: "text-pink-600", badgeColor: "bg-pink-50 text-pink-600" },
};

// 每个活动的专属配置（tip + 分步），角色/颜色继承模块默认
const ACTIVITY_DISPLAY: Record<string, { tip: string; animationSteps: string[] }> = {
  // —— 听觉技能 ——
  "sound-detection": {
    tip: "摇响铃铛 → 观察宝宝是否停止动作转头寻找",
    animationSteps: ["拿出铃铛，在宝宝身侧摇响", "观察宝宝是否转头寻找声源", "停下铃铛，看宝宝反应", "宝宝找到声源 = 成功！"],
  },
  "sound-discrimination": {
    tip: "发出两个不同声音 → 问宝宝\"一样吗？\"",
    animationSteps: ["发出声音A（如牛叫）", "发出声音B（如汽车）", "问宝宝：一样吗？", "宝宝判断异同 = 成功！"],
  },
  "sound-identification": {
    tip: "说出物品名 → 让宝宝从多件物品中找出",
    animationSteps: ["桌上摆3件物品", "清晰说出物品名称", "宝宝从多件中找出目标", "宝宝指对物品 = 成功！"],
  },
  "sound-comprehension": {
    tip: "说多步指令 → 让宝宝按顺序完成",
    animationSteps: ["说出一串指令（先…再…）", "观察宝宝是否理解", "宝宝按顺序执行", "全部做对 = 成功！"],
  },
  // —— 核心策略 ——
  "audition-first": {
    tip: "先发出声音 → 等2-3秒 → 再出示实物",
    animationSteps: ["先发出声音（不展示物品）", "等待2-3秒，让宝宝用耳朵听", "再出示实物或图片", "宝宝转头寻找声源 = 成功！"],
  },
  "auditory-sandwich": {
    tip: "听 → 看 → 再听，视觉辅助后立即撤除",
    animationSteps: ["先说词语（不展示）", "展示实物给宝宝看", "收起实物再说一次", "宝宝只听声音就理解 = 成功！"],
  },
  "acoustic-highlighting": {
    tip: "用音量/音高/语速突出目标词汇",
    animationSteps: ["说出句子，重音落在目标词", "放慢语速突出目标词", "观察宝宝对重音的注意", "宝宝听到重音有反应 = 成功！"],
  },
  "wait-time": {
    tip: "提问后停顿3-5秒，等宝宝回应",
    animationSteps: ["提出一个问题", "停顿3-5秒（默数）", "观察宝宝是否尝试回应", "宝宝回应 = 成功！耐心是关键"],
  },
  "auditory-bombardment": {
    tip: "在自然对话中将目标词重复说3次以上",
    animationSteps: ["在自然场景中找到目标物品", "用夸张语调重复说3次目标词", "每次间隔2-3秒，观察宝宝", "宝宝有反应就立刻表扬！"],
  },
  "expansion": {
    tip: "在宝宝表达基础上扩展成完整句子",
    animationSteps: ["宝宝说出词语（如\"球\"）", "妈妈扩展（\"红色的球\"）", "再扩展成完整句（\"宝宝在玩红色的球\"）", "宝宝听完整句 = 语言输入！"],
  },
  "sabotage": {
    tip: "故意制造\"错误\"情境，激发宝宝主动表达",
    animationSteps: ["制造预期不符情境（如给空杯）", "宝宝发现不对劲", "宝宝主动表达需求", "立即满足并表扬 = 主动表达！"],
  },
  "repair-communication": {
    tip: "听不清时引导宝宝确认和修复沟通",
    animationSteps: ["假装没听清宝宝的话", "引导宝宝再说一遍", "宝宝复述或换个方式表达", "沟通成功 = 修复能力！"],
  },
  // —— 日常常规 ——
  "morning-routine": {
    tip: "穿衣时用语言描述每个步骤",
    animationSteps: ["穿衣时描述动作（\"先穿袜子\"）", "加入顺序词（先…再…）", "让宝宝参与选择", "语言融入日常 = 自然输入"],
  },
  "mealtime": {
    tip: "用餐时描述食物名称、味道、质地",
    animationSteps: ["用餐时介绍食物名称", "描述味道（甜甜的）和质地（软软的）", "让宝宝选择（\"要香蕉还是饼干？\"）", "丰富词汇 = 用餐即学习"],
  },
  "bath-time": {
    tip: "洗澡时用拟声词描述动作",
    animationSteps: ["洗澡时描述动作（\"洗头发\"）", "加入拟声词（\"搓搓搓\"\"哗啦啦\"）", "让宝宝感受水的触感", "多感官输入 = 语言联结"],
  },
  "bedtime-routine": {
    tip: "睡前安静共读+晚安仪式",
    animationSteps: ["睡前共读绘本", "轻声描述画面内容", "说\"晚安\"道别仪式", "安静环境 = 深度输入"],
  },
  "cleanup-time": {
    tip: "收拾时用多步指令+分类概念",
    animationSteps: ["说分类指令（\"积木放红盒\"）", "让宝宝执行分类收拾", "表扬正确分类", "分类概念 + 指令理解"],
  },
  "going-out": {
    tip: "外出时识别环境声音（车、鸟、风）",
    animationSteps: ["外出时留意环境声音", "指向声源（\"听，警车声\"）", "描述声音特点", "听觉与环境联结"],
  },
  // —— 游戏互动 ——
  "peekaboo": {
    tip: "用\"不见了/在这里\"制造声音预期",
    animationSteps: ["用手帕遮住脸（\"不见了\"）", "露出笑脸（\"在这里！\"）", "重复几次建立预期", "声音与出现联结 = 听觉预期"],
  },
  "pretend-play": {
    tip: "角色扮演中练习对话和叙事",
    animationSteps: ["设置角色扮演场景", "妈妈扮演角色说话", "引导宝宝回应角色", "对话练习 = 叙事基础"],
  },
  "treasure-hunt": {
    tip: "用听觉线索引导宝宝找物品",
    animationSteps: ["藏好玩具", "给出听觉线索（\"在沙发后面\"）", "宝宝循线索寻找", "听觉理解 + 空间概念"],
  },
  "singing-movement": {
    tip: "儿歌+动作，增强记忆和节奏感",
    animationSteps: ["选一首简单儿歌", "边唱边做动作", "引导宝宝模仿动作", "节奏感 + 听觉记忆"],
  },
  "shared-reading": {
    tip: "互动式阅读，提问+等待回应",
    animationSteps: ["共读绘本，指着画面", "提问（\"小狗在做什么？\"）", "等待宝宝回应", "叙事理解 = 阅读基础"],
  },
  "blowing-activities": {
    tip: "吹泡泡锻炼呼吸控制，为发音打基础",
    animationSteps: ["示范吹泡泡动作", "引导宝宝模仿吹气", "练习\"呼\"的发音口型", "呼吸控制 = 发音基础"],
  },
  // —— 设备管理 ——
  "ling6-check": {
    tip: "每日6音检查确认设备工作正常",
    animationSteps: ["面对宝宝发第一音（m）", "宝宝听到举手/回应", "依次完成6个音", "全通过 = 设备正常！"],
  },
  "device-wearing": {
    tip: "建立全天佩戴习惯，正面情感联结",
    animationSteps: ["用温柔语气引导佩戴", "说\"戴上小耳朵\"", "佩戴后立即说好听的话", "正面联结 = 愿意佩戴"],
  },
  "device-troubleshooting": {
    tip: "快速排查电池、导线等常见故障",
    animationSteps: ["发现没声音时先检查电池", "再检查导线连接", "更换/调整后测试", "设备正常 = 训练保障"],
  },
  // —— 家长技巧 ——
  "face-to-face": {
    tip: "蹲下与宝宝视线平齐，最大化输入",
    animationSteps: ["蹲下与宝宝视线平齐", "指自己的嘴巴/眼睛", "清晰说话让宝宝看口型", "多感官输入最大化"],
  },
  "reduce-noise": {
    tip: "创造安静环境，减少听觉竞争",
    animationSteps: ["关掉电视/背景音乐", "示意\"现在安静了\"", "在安静环境里说话", "减少竞争 = 听得更清"],
  },
  "self-talk": {
    tip: "描述自己正在做的事，提供语言模型",
    animationSteps: ["边做事边描述（\"妈妈切苹果\"）", "用简单句+动作对应", "宝宝自然吸收语言", "语言模型 = 无需回应"],
  },
  "parallel-talk": {
    tip: "描述宝宝正在做的事，增强自我意识",
    animationSteps: ["观察宝宝正在做什么", "用简单句描述（\"你在搭积木\"）", "加入描述性词汇", "自我意识 + 语言输入"],
  },
  "praise-effort": {
    tip: "具体真诚的表扬，强化听觉注意力",
    animationSteps: ["宝宝完成听觉任务", "具体表扬（\"你听到了！\"）", "配合拥抱/击掌", "正强化 = 更愿意听"],
  },
};

// 获取活动的展示配置（角色/颜色继承模块默认，找不到用通用）
export function getActivityDisplay(id: string): ActivityDisplay {
  const act = getActivityById(id);
  const mod = act ? MODULE_DEFAULT[act.category] : undefined;
  const specific = ACTIVITY_DISPLAY[id];

  const base = mod || {
    character: "🐰", characterName: "听听",
    color: "bg-orange-50", borderColor: "border-orange-200",
    textColor: "text-orange-600", badgeColor: "bg-orange-50 text-orange-600",
  };

  return {
    ...base,
    tip: specific?.tip || "观察宝宝反应，及时给予鼓励",
    animationSteps: specific?.animationSteps || [
      "示范正确的做法", "观察宝宝反应", "给宝宝回应机会", "及时表扬鼓励",
    ],
  };
}

// 兼容旧的策略名（老数据 strategy 字段可能是中文策略名）
export const STRATEGY_TO_ACTIVITY: Record<string, string> = {
  "命名等待": "wait-time",
  "听觉轰炸": "auditory-bombardment",
  "听觉先行": "audition-first",
  "听觉优先": "audition-first",
  "平行说话": "parallel-talk",
  "声音觉察": "sound-detection",
  "声音分辨": "sound-discrimination",
  "声音识别": "sound-identification",
  "声音理解": "sound-comprehension",
};
