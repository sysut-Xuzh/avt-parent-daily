// JITAI 推送规则验证测试
// 运行: npx ts-node src/lib/__tests__/jitai-verify.ts 或 直接用 Node

const defaultJITAIConfig = {
  advanceMinutes: 10,
  expireAfterMinutes: 30,
  quietHours: { start: 12, end: 14 },
  sleepHours: { start: 21, end: 7 },
  maxSkipsBeforeCooldown: 2,
  cooldownMinutes: 60,
};

// 直接从 scheduler.ts 复制的 evaluatePush 逻辑，加了 now 参数
function evaluatePush(task, config = defaultJITAIConfig, testNow) {
  const currentTime = testNow || new Date();
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  const [taskHour, taskMinute] = task.time.split(":").map(Number);

  // 夜间免打扰 21:00 ~ 07:00
  const sleepStart = config.sleepHours.start * 60;
  const sleepEnd = config.sleepHours.end * 60;
  if (sleepStart > sleepEnd) {
    if (currentMinutes >= sleepStart || currentMinutes < sleepEnd) {
      return { shouldPush: false, reason: "❌ 夜间免打扰" };
    }
  } else {
    if (currentMinutes >= sleepStart && currentMinutes < sleepEnd) {
      return { shouldPush: false, reason: "❌ 免打扰" };
    }
  }

  // 午休 12:00 ~ 14:00
  const quietStart = config.quietHours.start * 60;
  const quietEnd = config.quietHours.end * 60;
  if (currentMinutes >= quietStart && currentMinutes < quietEnd) {
    return { shouldPush: false, reason: "❌ 午休不打扰" };
  }

  // 推送时间窗口
  const taskDate = new Date(currentTime);
  taskDate.setHours(taskHour, taskMinute, 0, 0);
  const windowStart = taskDate.getTime() - config.advanceMinutes * 60 * 1000;
  const windowEnd = taskDate.getTime() + config.expireAfterMinutes * 60 * 1000;
  const nowMs = currentTime.getTime();

  if (nowMs < windowStart) {
    return { shouldPush: false, reason: "⏳ 未到推送窗口", nextCheckAt: new Date(windowStart) };
  }
  if (nowMs > windowEnd) {
    return { shouldPush: false, reason: "⏳ 窗口已过期" };
  }
  return { shouldPush: true, reason: "✅ 在推送窗口内" };
}

// ===== 辅助：创建指定时间的 Date =====
function t(h, m) {
  const d = new Date(2026, 6, 17, h, m, 0);
  return d;
}

// ===== 测试用例 =====
const tests = [
  // [名称, 当前时间, 任务时间, 期望结果]
  ["夜间22点不应推送",      t(22, 0),  "22:00", false],
  ["凌晨3点不应推送",       t(3, 0),   "03:00", false],
  ["早上7点可以推送",       t(7, 20),  "07:30", true],
  ["午休13点不应推送",      t(13, 0),  "13:00", false],
  ["午休13:30不应推送",     t(13, 30), "13:30", false],
  ["下午14:20可以推送",     t(14, 20), "14:30", true],
  ["下午14:10还没到窗口",  t(14, 10), "14:30", false],
  ["提前5分钟可以推送",     t(7, 25),  "07:30", true],
  ["提前15分钟还没到窗口",  t(7, 15),  "07:30", false],
  ["过期31分钟不可推送",    t(8, 1),   "07:30", false],
  ["正好在窗口末尾可推送",  t(8, 0),   "07:30", true],
  ["早上8点正常推送",       t(8, 0),   "08:00", true],
  ["晚上20点可推送",        t(20, 0),  "20:00", true],
];

console.log("=".repeat(56));
console.log("   JITAI 推送规则验证测试");
console.log("=".repeat(56));

let passed = 0, failed = 0;
for (const [name, now, taskTime, expected] of tests) {
  const result = evaluatePush({ time: taskTime }, defaultJITAIConfig, now);
  const ok = result.shouldPush === expected;
  const icon = ok ? "✅" : "❌";
  const status = ok ? "通过" : "失败";
  if (ok) passed++; else failed++;

  console.log(` ${icon} ${name}`);
  console.log(`     ${result.reason}`);
  console.log(`     期望: ${expected ? "推送" : "不推送"} → ${status}`);
  console.log(`     ─────────────────────────`);
}

console.log("=".repeat(56));
console.log(`   结果: ${passed}/${passed + failed} 通过`);
if (failed > 0) console.log(`   ❌ ${failed} 个测试失败`);
else console.log("   ✅ 全部通过！");
console.log("=".repeat(56));

process.exit(failed > 0 ? 1 : 0);
