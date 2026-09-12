// 终极验证：3 轮 改词→保存→立即查询，确认实时同步
async function main() {
  const BASE = "http://localhost:3005";
  const rounds = [
    { word: "苹果", expect: "苹果" },
    { word: "西瓜", expect: "西瓜" },
    { word: "香蕉", expect: "香蕉" },
  ];

  for (const round of rounds) {
    // 保存
    const saveRes = await fetch(`${BASE}/api/weekly-plans/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        babyName: "小宝",
        targetWords: `${round.word}、狗、水、晚安`,
        strategies: ["命名等待", "听觉轰炸", "听觉先行", "平行说话"],
        scenes: ["早餐", "游戏", "洗澡", "睡前"],
        dailyCount: 4,
      }),
    });
    const saveData = await saveRes.json();
    if (!saveData.success) { console.log("❌ 保存失败:", JSON.stringify(saveData)); return; }

    // 立即查家长端
    const tasksRes = await fetch(`${BASE}/api/tasks/today`);
    const tasksData = await tasksRes.json();
    const firstWord = tasksData.tasks?.[0]?.targetWord;
    const ok = firstWord === round.expect;
    console.log(`${ok ? "✅" : "❌"} 保存「${round.word}」→ 家长端立即查到「${firstWord}」${ok ? "同步成功" : "同步失败！"}`);
  }
}
main();
