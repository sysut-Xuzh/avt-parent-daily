// 功能导览 / 新手引导 内容库（依据《录音识别与内容扩展》方案）
// 对齐当前网站已实装功能：声纹建档、任务录音⭐评级、每日语音练习、治疗师推荐、成长日历⭐

export type ScreenKey =
  | "welcome"
  | "tasks"
  | "taskCard"
  | "hearing"
  | "learning"
  | "community"
  | "profile"
  | "done";

export interface OnboardingStep {
  key: ScreenKey;
  title: string;
  bubble: string;
  highlight: string; // 高亮元素描述（示意）
}

// 首次登录 8 步导览（欢迎 + 5 个底部 Tab + 任务卡片 + 完成）
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: "welcome",
    title: "欢迎使用 AI 康复助手",
    bubble: "您好，我们用 1 分钟带您了解核心功能，陪孩子更好地练习。",
    highlight: "全屏欢迎卡片",
  },
  {
    key: "tasks",
    title: "今日任务",
    bubble: "每天打开这里，查看孩子今天的训练任务。",
    highlight: "底部 Tab「今日任务」",
  },
  {
    key: "taskCard",
    title: "开始训练并录音",
    bubble: "点任务卡片开始训练，完成后自动打卡；点 🎙️ 可录音评估孩子参与度。",
    highlight: "任务卡片 / 麦克风按钮",
  },
  {
    key: "hearing",
    title: "听力测试",
    bubble: "每周做一次测评，AI 会分析孩子的听力进步。",
    highlight: "底部 Tab「听力测试」",
  },
  {
    key: "learning",
    title: "每日学习",
    bubble: "这里有专业康复知识，学完点「带孩子一起练」立刻实践。",
    highlight: "底部 Tab「每日学习」",
  },
  {
    key: "community",
    title: "康复圈",
    bubble: "看看其他家长的康复经验，也可以分享孩子的进步瞬间。",
    highlight: "底部 Tab「康复圈」",
  },
  {
    key: "profile",
    title: "我的",
    bubble: "宝宝声线、训练记录、功能导览都在这里，随时回看。",
    highlight: "底部 Tab「我的」",
  },
  {
    key: "done",
    title: "完成导览 🎉",
    bubble: "首周训练计划已生成，您和孩子都很棒，加油！",
    highlight: "全屏庆祝",
  },
];

export interface GuideModule {
  id: string;
  icon: string;
  title: string;
  desc: string;
  steps: { title: string; body: string }[];
}

// 按模块讲解（对齐当前实装功能）
export const GUIDE_MODULES: GuideModule[] = [
  {
    id: "tasks",
    icon: "🏠",
    title: "今日任务怎么做？",
    desc: "每天 3 个训练任务，坚持就有徽章",
    steps: [
      { title: "查看今日任务", body: "首页「今日训练清单」列出今天的治疗师计划任务，点卡片进入训练说明页。" },
      { title: "完成并打卡", body: "按说明带孩子做完，点「完成」即自动打卡，顶部进度 +1，连续天数累加。" },
      { title: "🎙️ 录音评估参与度", body: "卡片上的麦克风按钮可录音：本地分析后给出 ⭐1-5 参与度评分与 0-100 分。原始音频只留本机，云端仅存脱敏指标。" },
      { title: "补做与徽章", body: "逾期任务可「补做」，不影响连续打卡；连续 3 / 7 / 30 天会触发全屏庆祝与徽章。" },
    ],
  },
  {
    id: "hearing",
    icon: "🎧",
    title: "听力测试怎么测？",
    desc: "四级测评，逐级解锁",
    steps: [
      { title: "四级入口", body: "从「察知」开始，逐步挑战到「分辨 → 识别 → 理解」，每通过一级自动解锁下一级。" },
      { title: "游戏化题型", body: "点听到的声音、或把图片拖到对应位置，像玩游戏一样完成。" },
      { title: "录音跟读题", body: "遇到录音题型，按住 🎙️ 让孩子跟读，松手即完成，AI 评参与度。" },
      { title: "测评报告", body: "完成后出雷达图，展示 4 项能力，红色区域是待加强方向。" },
      { title: "成长日历", body: "日历上的 🎯 标记每次测评，点开看详情；第 2 次测评后显示与上次对比的进步。" },
    ],
  },
  {
    id: "learning",
    icon: "📖",
    title: "每日学习怎么学？",
    desc: "专业康复知识 + 即学即练",
    steps: [
      { title: "6 大内容分类", body: "听觉 / 言语 / 语言 / 认知 / 心理 / 推荐，按需浏览。" },
      { title: "阶段路径", body: "根据孩子水平，从「初配 → 适应 → 提升 → 融合」循序渐进。" },
      { title: "学习打卡", body: "读完文章即打卡，连续 7 天学习获得「好学家长」徽章。" },
      { title: "记笔记", body: "文章详情点「记笔记」，记录孩子的反应和你的疑问，治疗师可看到。" },
      { title: "去练习联动", body: "文章底部「带孩子一起练（语音练习）」一键进入声线实验室跟读，理论立刻实践。" },
      { title: "收藏", body: "好文章点「加入书架」，方便下次回看。" },
    ],
  },
  {
    id: "community",
    icon: "👥",
    title: "康复圈怎么用？",
    desc: "和其他家长一起抱团",
    steps: [
      { title: "浏览信息流", body: "看看其他家长的康复经验与好物分享。" },
      { title: "发布动态", body: "记录孩子的进步瞬间，或向社区提问求助。" },
      { title: "个人主页", body: "查看自己的动态与已获得徽章。" },
      { title: "互动", body: "给鼓励的家长点赞，或留言交流经验。" },
    ],
  },
  {
    id: "recording",
    icon: "🎙️",
    title: "录音与 AI 指导（核心）",
    desc: "本地分析，隐私优先",
    steps: [
      { title: "宝宝声线录入", body: "设置页「宝宝声线」首次录入一段孩子说话声，AI 判断更准。孩子不配合可跳过——任务录音达标后也会自动推断基线。" },
      { title: "任务录音评级", body: "点 🎙️ 录音 → 提交分析 → 出 ⭐1-5 星级 + 0-100 分，仅本地与脱敏云端，音频永不外传。" },
      { title: "每日语音练习", body: "首页或文章里的「去练习」进入声线实验室，跟读几个词看参与度。" },
      { title: "回放确认", body: "录音结束先听一遍，确认是孩子独立完成的再提交。" },
      { title: "环境噪音提示", body: "环境太吵时提醒使用领夹式麦克风，保证分析准确。" },
      { title: "治疗师推荐", body: "治疗师端推送的内容会显示在首页「治疗师推荐」，可直接去练习。" },
    ],
  },
  {
    id: "therapist",
    icon: "💬",
    title: "怎么联系治疗师？",
    desc: "工单 + 内容推荐",
    steps: [
      { title: "提交工单", body: "设置 / 我的里点「联系治疗师」，200 字内描述问题，治疗师 24 小时内回复。" },
      { title: "查看回复", body: "收到回复时消息页顶部横幅提醒，点开即可查看。" },
      { title: "治疗师推荐内容", body: "治疗师推送的学习内容会同步到首页「治疗师推荐」卡片，可查看或去练习。" },
    ],
  },
];

export interface Faq {
  q: string;
  a: string;
}

export const GUIDE_FAQ: Faq[] = [
  {
    q: "孩子不配合训练怎么办？",
    a: "短时多次、游戏化进行；先和孩子声线互动建立兴趣；目标调低一点，完成就给正向反馈。别强迫，每天 5-10 分钟胜过一次长训。",
  },
  {
    q: "测评结果怎么看？",
    a: "报告是雷达图，展示 4 项听觉能力，红色区域是待加强方向；第 2 次测评后可与上次对比，看「识别」「理解」等是否提升。",
  },
  {
    q: "录音为什么没有分数 / 星级很低？",
    a: "需要孩子出声且环境不太吵。若没有检测到孩子声线，会评最低星；多录几次后系统会用任务录音自动推断孩子的声线基线，评分会越来越准。",
  },
  {
    q: "连续打卡断了能补吗？",
    a: "可以。首页逾期任务点「补做」即可，不影响已完成的记录；连续天数从最近一次完成日重新累计。",
  },
  {
    q: "如何修改孩子档案？",
    a: "进入「我的 / 设置」→「宝宝信息」，可修改名字、出生日期、助听设备类型，保存后立即生效。",
  },
];

// 首周训练指南
export const FIRST_WEEK_PLAN: { day: string; task: string }[] = [
  { day: "第 1 天", task: "完成 3 个今日任务，并在设置页录入宝宝声线（可跳过）。" },
  { day: "第 2-3 天", task: "每天做一次「每日语音练习」跟读，熟悉 ⭐ 参与度评分。" },
  { day: "第 4-5 天", task: "做一次听力测试（从「察知」级开始），看雷达图报告。" },
  { day: "第 6 天", task: "读 1 篇「每日学习」文章并记一条笔记。" },
  { day: "第 7 天", task: "完成 7 天连续打卡，领取「坚持徽章」🥇。" },
];

export const ONBOARDING_FLAG = "avt_onboarded";
