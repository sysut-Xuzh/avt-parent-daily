// 引导脚本模型（阶段四 · D「感知→引导」AI 辅助康复闭环）
// ---------------------------------------------------------------
// 核心不是动画：把「家长提示 → 等待 → 反馈 → 确认加强」做成可配置脚本，
// 系统用语音/视觉「感知」孩子这一步是否真的配合，再给下一步提示。
// 每个训练任务内置 step 序列，step 结构见 GuideStep。

export type DetectMode = "voice" | "visual" | "manual";

export interface GuideStep {
  id: string;
  /** 家长此刻该做什么 / 给孩子什么示范 */
  prompt: string;
  /** 期望孩子做出什么反应（用于向家长解释「在等什么」） */
  expect: string;
  /** 如何「感知」这一步完成 */
  detect: DetectMode;
  /** 成功时的正向反馈话术（孩子配合后立刻给） */
  successHint: string;
  /** 超时 / 未配合时的重试提示 */
  retryHint: string;
  /** 该步等待感知的最长秒数（超时转 retry） */
  timeoutSec?: number;
}

export interface GuideScript {
  activityId: string;
  title: string;
  /** 开场：给家长的总体说明 */
  intro: string;
  steps: GuideStep[];
}

export interface GuideScriptInput {
  activityId?: string;
  activityName?: string;
  targetWord?: string;
  scene?: string;
}

const DEFAULT_TIMEOUT = 12;

/** 通用步骤构造器：把「吸引→示范→等待发声→强化」套到具体词/场景上 */
function buildGenericSteps(word: string, scene: string): GuideStep[] {
  const w = word || "目标词";
  return [
    {
      id: "attract",
      prompt: "先叫孩子的名字或轻唤，等 TA 看向你再开始。",
      expect: "孩子目光接触、注意力在你身上",
      detect: "manual",
      successHint: "注意力到位，太好了，可以开始了 👀",
      retryHint: "放慢一点，先不急着说词，玩一下再吸引注意。",
    },
    {
      id: "model",
      prompt: `清晰、夸张地说出「${w}」，配合眼前情境「${scene || "眼前的事物"}」。`,
      expect: "你示范时孩子安静地听",
      detect: "manual",
      successHint: "示范很棒，孩子听到了这个声音 🔊",
      retryHint: "把词再放慢、再清楚一点，配合动作或实物。",
    },
    {
      id: "wait",
      prompt: `停顿 3–5 秒，等孩子自己回应——发出声音、模仿或指认都算。`,
      expect: "孩子发声 / 模仿 / 主动回应",
      detect: "voice",
      successHint: "🎉 听到了！孩子真的回应了，了不起！",
      retryHint: "别急，再慢一点示范一次，然后继续等 TA 发声。",
      timeoutSec: DEFAULT_TIMEOUT,
    },
    {
      id: "reinforce",
      prompt: `立刻正面回应：重复「${w}」+ 给一个拥抱或击掌，强化这次成功。`,
      expect: "孩子感受到被鼓励，情绪积极",
      detect: "manual",
      successHint: "这一步完成，宝贝又向前一步 🌟",
      retryHint: "哪怕只发出一点点声音也值得鼓励，先肯定再练。",
    },
  ];
}

/** 针对 4 个演示活动做更贴切的脚本覆盖 */
function buildOverride(activityId: string, word: string, scene: string): GuideStep[] | null {
  const w = word || "目标词";
  switch (activityId) {
    case "wait-time":
      return [
        {
          id: "attract",
          prompt: "拿起孩子喜欢的东西（如苹果），先不说话，等 TA 注意。",
          expect: "孩子看向苹果和你",
          detect: "manual",
          successHint: "注意力抓住啦 🍎",
          retryHint: "把东西举到孩子视线高度，慢慢摇一摇吸引注意。",
        },
        {
          id: "model",
          prompt: `说「${w}」，然后——关键来了——停住，什么都不做。`,
          expect: "你示范后保持安静",
          detect: "manual",
          successHint: "示范完成，现在是最珍贵的等待时间 ⏳",
          retryHint: "说完后一定要忍住，别马上塞给孩子。",
        },
        {
          id: "wait",
          prompt: "默数 3–5 秒，用期待的眼神看孩子，等 TA 主动要 / 发声。",
          expect: "孩子伸手 / 发声 / 说词",
          detect: "voice",
          successHint: "🎉 等待见效！孩子主动回应了",
          retryHint: "再延长一点等待，别抢着替孩子说，让沉默发挥作用。",
          timeoutSec: 15,
        },
        {
          id: "reinforce",
          prompt: "孩子一回应立刻给：「对！${w}！」并递出奖励，击掌庆祝。",
          expect: "孩子获得正向强化",
          detect: "manual",
          successHint: "等待→回应的链条打通了，记下来 🌟",
          retryHint: "回应无论大小都先肯定，再慢慢拉长等待。",
        },
      ];
    case "auditory-bombardment":
      return [
        {
          id: "attract",
          prompt: "把孩子带到安静环境，准备好「声音道具」（如小狗玩具）。",
          expect: "环境少干扰，孩子可专注听",
          detect: "manual",
          successHint: "环境就位，开始听觉轰炸 🐶",
          retryHint: "关掉电视，靠近孩子耳边一点说。",
        },
        {
          id: "model",
          prompt: `连续、有节奏地说「${w}！${w}！${w}！」，让声音反复冲击耳朵。`,
          expect: "孩子持续听到目标声音",
          detect: "manual",
          successHint: "声音轰炸完成，孩子听饱了 🔊",
          retryHint: "语速放慢、音量稍大、带点夸张表情。",
        },
        {
          id: "wait",
          prompt: "停一下，观察孩子是否想模仿或发出类似声音。",
          expect: "孩子尝试发声 / 模仿",
          detect: "voice",
          successHint: "🎉 孩子被「炸」出声音了！",
          retryHint: "再来一轮轰炸，这次停顿更长一点等模仿。",
          timeoutSec: DEFAULT_TIMEOUT,
        },
        {
          id: "reinforce",
          prompt: "孩子一出声就大笑鼓励：「对对对，就是 ${w}！」",
          expect: "孩子获得听觉+情绪双重强化",
          detect: "manual",
          successHint: "这一轮轰炸很成功 🌟",
          retryHint: "哪怕只是咯咯笑也先庆祝，再巩固。",
        },
      ];
    case "audition-first":
      return [
        {
          id: "attract",
          prompt: "先把实物藏起来或拿远，只让孩子「听」, 不「看」。",
          expect: "孩子只能靠听觉，看不到东西",
          detect: "manual",
          successHint: "听觉通道打开了 👂",
          retryHint: "用手遮一下物品，确保先听后看。",
        },
        {
          id: "model",
          prompt: `先只说「${w}」三次，不出示实物，建立声音→意义的联结。`,
          expect: "孩子专注听声音",
          detect: "manual",
          successHint: "先听完成，孩子记住了声音 🔊",
          retryHint: "说的时候别让东西露出来，纯听觉输入。",
        },
        {
          id: "wait",
          prompt: "说完停顿，等孩子因「好奇/想看」而发声或转头寻找。",
          expect: "孩子寻找声源 / 发声",
          detect: "voice",
          successHint: "🎉 孩子用听来寻找了，了不起！",
          retryHint: "再重复几遍声音，然后才出示实物。",
          timeoutSec: DEFAULT_TIMEOUT,
        },
        {
          id: "reinforce",
          prompt: "此时才出示实物并说「看，${w}！」，把声音和实物连起来。",
          expect: "孩子看到实物，完成听→看联结",
          detect: "manual",
          successHint: "听觉先行闭环完成 🌟",
          retryHint: "下次更早一步让孩子听，再给看。",
        },
      ];
    default:
      return null;
  }
}

/**
 * 取得某训练任务的引导脚本。
 * 优先使用活动专属覆盖；否则用通用模板（套入目标词/场景）。
 */
export function getGuideScript(input: GuideScriptInput): GuideScript {
  const word = input.targetWord?.trim() || "";
  const scene = input.scene?.trim() || "";
  const steps = buildOverride(input.activityId || "", word, scene) || buildGenericSteps(word, scene);
  const title = input.targetWord
    ? `训练「${input.targetWord}」`
    : input.activityName || "今日训练";
  return {
    activityId: input.activityId || "generic",
    title,
    intro: word
      ? `陪孩子练「${word}」。每一步先照提示做，系统会感知孩子的回应再推进。`
      : `陪孩子完成这一步训练。每一步先照提示做，系统会感知孩子的回应再推进。`,
    steps,
  };
}
