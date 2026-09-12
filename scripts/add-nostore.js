// 批量给 API 的 fetch 注入 cache: "no-store"（针对 headers: {...} 单行模式）
const fs = require("fs");
const path = require("path");

const apiDir = path.join(__dirname, "..", "src", "app", "api");
const targets = ["calendar", "logs", "push/check", "push/send", "recordings/list", "reports/daily-summary", "reports/weekly-story", "weekly-plans/current"];

function walk(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(walk(full));
    else if (entry.name === "route.ts") results.push(full);
  }
  return results;
}

let modified = 0;
for (const file of walk(apiDir)) {
  // 只处理目标 API
  const rel = file.replace(apiDir, "").replace(/\\/g, "/").replace(/^\/api\//, "").replace(/\/route\.ts$/, "");
  if (!targets.includes(rel) && rel !== "calendar") continue;

  let content = fs.readFileSync(file, "utf8");
  const original = content;

  // 模式1：{ headers: { apikey: ... } } 单行
  content = content.replace(
    /\{ headers: \{ apikey: \[?redacted\]?.*? \} \}/g,
    (m) => {
      if (m.includes("cache:")) return m;
      return `{ cache: "no-store", headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } }`;
    }
  );

  // 模式2：{ headers: { ... } } 但 apikey 写法不同
  content = content.replace(
    /(\{ headers: \{ apikey: )([^}]*?)( \} \})/g,
    (m, pre, mid, post) => {
      if (m.includes("cache:")) return m;
      return `{ cache: "no-store", headers: { apikey: ${mid.trim()} } }`;
    }
  );

  // 模式3：方法+headers，如 { method: "POST", headers: {...} }
  content = content.replace(
    /(\{ method: "([A-Z]+)", headers: \{ apikey: )([^}]*?)( \} \})/g,
    (m, pre, method, mid, post) => {
      if (m.includes("cache:")) return m;
      return `{ method: "${method}", cache: "no-store", headers: { apikey: ${mid.trim()} } }`;
    }
  );

  if (content !== original) {
    fs.writeFileSync(file, content, "utf8");
    console.log("✅", rel);
    modified++;
  }
}
console.log(`\n共修改 ${modified} 个文件`);
