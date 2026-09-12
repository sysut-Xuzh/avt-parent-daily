// 复刻 /api/tasks/today 的完整逻辑（含去重）
const SUPA_URL = "https://tekrqwudpvzrklnjotmf.supabase.co";
const SUPA_KEY = require("fs").readFileSync(
  "C:\\Users\\徐子涵\\AppData\\Roaming\\reasonix\\global-workspace\\avt-parent-daily\\.env.local", "utf8"
).match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const headers = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };

async function main() {
  const babyId = "b0000000-0000-0000-0000-000000000001";
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // 1. 查日计划
  const plans = await fetch(`${SUPA_URL}/rest/v1/daily_plans?select=id&baby_id=eq.${babyId}&date=eq.${today}`, { headers }).then(r => r.json());
  console.log("日计划:", plans.map(p => p.id));

  // 2. 查任务
  const planIds = plans.map(p => p.id);
  const filter = planIds.join(",");
  const tasks = await fetch(`${SUPA_URL}/rest/v1/tasks?select=*&daily_plan_id=in.(${filter})&order=sort_order.asc`, { headers }).then(r => r.json());
  console.log("\n原始任务数:", tasks.length);
  tasks.forEach(t => console.log(`  id=${t.id.slice(0,8)} word=${t.target_word} sort=${t.sort_order} anim=${t.animation_url || "无"}`));

  // 3. 去重逻辑
  const bySortOrder = new Map();
  for (const row of tasks) {
    const sortOrder = row.sort_order || 0;
    const existing = bySortOrder.get(sortOrder);
    if (!existing) {
      bySortOrder.set(sortOrder, row);
    } else {
      if (row.animation_url && !existing.animation_url) {
        bySortOrder.set(sortOrder, row);
      }
    }
  }
  console.log("\n去重后任务:");
  Array.from(bySortOrder.values()).sort((a, b) => a.sort_order - b.sort_order)
    .forEach(t => console.log(`  word=${t.target_word} sort=${t.sort_order}`));
}
main();
