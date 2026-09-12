import { DailyTask, UserProgress, TabItem } from "@/types";

export const mockTasks: DailyTask[] = [
  {
    id: "task-1",
    time: "07:30",
    scene: "早餐",
    sceneIcon: "🍳",
    strategy: "命名等待",
    targetWord: "苹果",
    instruction: "拿起苹果 → 说\"苹果\" → 靠近耳边 → 等5秒",
    completed: false,
    animationUrl: "/animations/mingming-dengdai-pingguo.mp4",
    speechText: "苹果",
    audioUrl: "/animations/speech-01-pingguo.mp3",
  },
  {
    id: "task-2",
    time: "10:00",
    scene: "游戏",
    sceneIcon: "🎮",
    strategy: "听觉轰炸",
    targetWord: "狗",
    instruction: "拿出狗卡片 → 说3次\"汪汪\" → 等一等 → 看反应",
    completed: false,
    speechText: "汪汪，汪汪，汪汪",
    audioUrl: "/animations/speech-02-gou.mp3",
    animationUrl: "/animations/tingjue-hongzha-gou.mp4",
  },
  {
    id: "task-3",
    time: "18:00",
    scene: "洗澡",
    sceneIcon: "🛁",
    strategy: "听觉先行",
    targetWord: "水",
    instruction: "说\"听，水声！\" → 等2秒 → 开水龙头 → 看宝宝反应",
    completed: false,
    speechText: "洗头发，搓搓搓，水哗啦啦",
    audioUrl: "/animations/speech-03-shui.mp3",
    animationUrl: "/animations/tingjue-xianxing-shui.mp4",
  },
  {
    id: "task-4",
    time: "20:00",
    scene: "睡前",
    sceneIcon: "🌙",
    strategy: "平行说话",
    targetWord: "晚安",
    instruction: "抱着宝宝说\"我们要睡觉啦\" → 轻声说\"晚安\" → 抚摸额头",
    completed: false,
    speechText: "月亮在天上，星星眨眼睛",
    audioUrl: "/animations/speech-04-wanan.mp3",
    animationUrl: "/animations/pingxing-shuohua-wanan.mp4",
  },
];

export const mockProgress: UserProgress = {
  streakDays: 7,
  todayCompleted: 0,
  todayTotal: 4,
  weeklyCompleted: 15,
  weeklyTotal: 21,
};

export const bottomTabs: TabItem[] = [
  { id: "tasks", label: "今日任务", icon: "📋" },
  { id: "hearing", label: "听力测试", icon: "🎧" },
  { id: "learning", label: "每日学习", icon: "📚" },
  { id: "community", label: "康复圈", icon: "💬" },
  { id: "profile", label: "我的", icon: "⚙️" },
];

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "早上好";
  if (hour < 18) return "下午好";
  return "晚上好";
}

export function getTodayDateString(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekday = weekdays[now.getDay()];
  return `${month}月${day}日 ${weekday}`;
}
