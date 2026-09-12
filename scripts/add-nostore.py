# 给 API 文件的 fetch 配置对象注入 cache: "no-store"
# 匹配 { headers: { apikey: ..., Authorization: ... } } 模式
import re, os, glob

api_dir = os.path.join(os.path.dirname(__file__), "..", "src", "app", "api")

# 目标文件（含多行 fetch 的）
targets = [
    "logs/route.ts",
    "recordings/list/route.ts",
    "weekly-plans/current/route.ts",
    "reports/daily-summary/route.ts",
    "reports/weekly-story/route.ts",
    "push/check/route.ts",
    "push/send/route.ts",
]

modified = 0
for rel in targets:
    p = os.path.join(api_dir, rel)
    if not os.path.exists(p):
        print("跳过(不存在):", rel)
        continue
    with open(p, "r", encoding="utf-8") as f:
        content = f.read()
    original = content

    # 匹配 { headers: { ... } } —— 跨行，但对象内无嵌套花括号
    # 先找 fetch 调用中未含 cache: 的 headers 对象
    pattern = re.compile(
        r"\{\s*headers:\s*\{([^{}]*)\}\s*\}",
        re.DOTALL
    )
    def repl(m):
        return '{ cache: "no-store", headers: {' + m.group(1) + '} }'
    content = pattern.sub(repl, content)

    # 也处理 { method: "...", headers: {...} } —— method 在前
    pattern2 = re.compile(
        r"\{\s*method:\s*\"([A-Z]+)\",\s*headers:\s*\{([^{}]*)\}\s*\}",
        re.DOTALL
    )
    def repl2(m):
        return '{ method: "' + m.group(1) + '", cache: "no-store", headers: {' + m.group(2) + '} }'
    content = pattern2.sub(repl2, content)

    # 检查是否已有 cache（避免重复注入）
    # 如果某处 headers 前面已经有 cache:，跳过（pattern 不会匹配已含 cache 的情况，因为 pattern 要求 { headers: 开头）

    if content != original:
        with open(p, "w", encoding="utf-8") as f:
            f.write(content)
        print("✅", rel)
        modified += 1
    else:
        print("未变:", rel)

print(f"\n共修改 {modified} 个文件")
