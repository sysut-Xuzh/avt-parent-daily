/**
 * AVT 32条家庭康复训练任务语音引导词
 * 数据来源：AVT家庭康复训练32条目分镜脚本手册.csv → 核心动作列中提取的家长对话
 * 用途：动画弹窗中 Web Speech API 朗读的文本，给家长示范"应该怎么对宝宝说话"
 */

export interface TaskSpeech {
  /** 任务编号（01-32） */
  no: string;
  /** 类别 */
  category: string;
  /** 条目名称 */
  name: string;
  /** 家长引导语（从核心动作中提取的对话） */
  speech: string;
  /** 核心动作完整描述 */
  action: string;
}

export const taskSpeechMap: TaskSpeech[] = [
  { no: "01", category: "听觉技能", name: "声音觉察", speech: "叮铃铃，听！", action: "摇铃→转头找声源" },
  { no: "02", category: "听觉技能", name: "声音分辨", speech: "哞——嗡——，一样吗？", action: "奶牛哞 vs 汽车嗡→判断异同" },
  { no: "03", category: "听觉技能", name: "声音识别", speech: "给我勺子", action: "给我勺子→从3件物品中选出" },
  { no: "04", category: "听觉技能", name: "声音理解", speech: "先拿红球，再放进篮子", action: "先拿红球，再放进篮子→执行多步指令" },
  { no: "05", category: "核心策略", name: "听觉优先", speech: "苹果", action: "先说苹果→再拿出苹果" },
  { no: "06", category: "核心策略", name: "听觉三明治", speech: "球", action: "听球→看指球→再听球" },
  { no: "07", category: "核心策略", name: "声学强调", speech: "红——色——的球", action: "红色的球→重音突出" },
  { no: "08", category: "核心策略", name: "等待时间", speech: "你听到了什么？", action: "提问→默数1-5→孩子回应" },
  { no: "09", category: "核心策略", name: "听觉轰炸", speech: "杯杯，包包，笔笔", action: "/b/音物品游戏→大量输入目标音" },
  { no: "10", category: "核心策略", name: "扩展", speech: "红色的球", action: "孩子说球→家长红色的球" },
  { no: "11", category: "核心策略", name: "破坏期待", speech: "要水！", action: "给空杯子→孩子纠正要水" },
  { no: "12", category: "核心策略", name: "问听到了什么", speech: "你听到了什么？再说一遍", action: "听不清时→引导孩子复述确认" },
  { no: "13", category: "日常常规", name: "晨起常规", speech: "先穿红色袜子", action: "穿衣时描述先穿红色袜子" },
  { no: "14", category: "日常常规", name: "用餐时间", speech: "要香蕉还是饼干？", action: "要香蕉还是饼干→描述食物" },
  { no: "15", category: "日常常规", name: "洗澡时间", speech: "洗头发，搓搓搓，水哗啦啦", action: "洗头发搓搓搓水哗啦啦" },
  { no: "16", category: "日常常规", name: "睡前常规", speech: "月亮在天上，星星眨眼睛", action: "读绘本月亮在天上星星眨眼睛" },
  { no: "17", category: "日常常规", name: "收拾玩具", speech: "积木放红盒，车放蓝盒", action: "积木放红盒车放蓝盒→分类指令" },
  { no: "18", category: "日常常规", name: "出门活动", speech: "听，警车的笛声，呜——呜——", action: "听警车的笛声呜呜" },
  { no: "19", category: "游戏互动", name: "躲猫猫", speech: "不见了，在这里！", action: "不见了→在这里→声音+表情" },
  { no: "20", category: "游戏互动", name: "过家家", speech: "饿了，吃饭饭", action: "小熊玩偶饿了吃饭饭→角色扮演" },
  { no: "21", category: "游戏互动", name: "寻宝游戏", speech: "它在沙发后面", action: "它在沙发后面→听线索找玩具" },
  { no: "22", category: "游戏互动", name: "唱歌律动", speech: "洗洗手，洗洗手", action: "洗洗手歌→边唱边做动作" },
  { no: "23", category: "游戏互动", name: "绘本共读", speech: "小狗在做什么？跑！", action: "小狗在做什么→跑" },
  { no: "24", category: "游戏互动", name: "吹泡泡", speech: "呼——泡泡飞出来了", action: "呼泡泡飞起来了→呼吸+发音" },
  { no: "25", category: "设备管理", name: "Ling-6声音检查", speech: "m—ah—oo—ee—sh—s", action: "发m ah oo ee sh s→听到举手" },
  { no: "26", category: "设备管理", name: "助听器佩戴", speech: "戴上小耳朵，听妈妈说话", action: "戴上小耳朵听妈妈说话" },
  { no: "27", category: "设备管理", name: "设备故障排查", speech: "没声音？换电池，好了！", action: "没声音换电池好了" },
  { no: "28", category: "家长技巧", name: "面对面交流", speech: "看妈妈的眼睛，听妈妈说", action: "蹲下平视看妈妈的眼睛听妈妈说" },
  { no: "29", category: "家长技巧", name: "减少背景噪音", speech: "现在安静了，听故事", action: "关电视现在安静了听故事" },
  { no: "30", category: "家长技巧", name: "自我谈话", speech: "妈妈在切苹果", action: "边做饭边描述妈妈在切苹果" },
  { no: "31", category: "家长技巧", name: "平行谈话", speech: "你在搭积木，高高的塔", action: "描述孩子动作你在搭积木高高的塔" },
  { no: "32", category: "家长技巧", name: "正向激励", speech: "太棒了！你听到了！", action: "太棒了你听到了→鼓掌+拥抱" },
];

/**
 * 根据策略和目标词获取语音引导词
 * 优先匹配 taskSpeechMap，找不到则回退到策略默认模板
 */
export function getSpeechByStrategy(strategy: string, targetWord: string): string {
  // 策略 → CSV编号映射
  const strategyToNo: Record<string, string> = {
    "命名等待": "05",
    "听觉轰炸": "09",
    "听觉先行": "15",
    "平行说话": "31",
  };

  const no = strategyToNo[strategy];
  if (no) {
    const task = taskSpeechMap.find((t) => t.no === no);
    if (task) return task.speech;
  }

  // 回退
  return targetWord;
}
