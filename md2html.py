# -*- coding: utf-8 -*-
"""生成自包含 HTML：把 demo-images 里的图片 base64 内嵌进文档"""
import markdown, sys, os, base64, re
sys.stdout.reconfigure(encoding="utf-8")

demo_dir = os.path.join(os.path.expanduser("~"), "Desktop", "AVT功能演示")
md_path = os.path.join(demo_dir, "FUNCTION-DEMO.md")
html_path = os.path.join(demo_dir, "AVT功能演示-发给老师.html")
img_dir = os.path.join(demo_dir, "demo-images")

with open(md_path, encoding="utf-8") as f:
    md_text = f.read()

html_body = markdown.markdown(
    md_text,
    extensions=["tables", "fenced_code", "toc", "attr_list"],
)

# 把图片路径替换为 base64 内嵌
def embed_images(match):
    alt = match.group(1)
    src = match.group(2)
    if src.startswith("demo-images/"):
        img_path = os.path.join(img_dir, os.path.basename(src))
        if os.path.exists(img_path):
            with open(img_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            ext = os.path.splitext(img_path)[1].lstrip(".").lower()
            mime = "png" if ext == "png" else ext
            return f'<img alt="{alt}" src="data:image/{mime};base64,{b64}" />'
    return match.group(0)

html_body = re.sub(r'<img alt="([^"]*)" src="([^"]+)" ?/?>', embed_images, html_body)

html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AVT 听损儿童康复训练平台 — 功能演示</title>
<style>
  body { font-family: -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif;
         max-width: 900px; margin: 0 auto; padding: 24px;
         background: #fafafa; color: #333; line-height: 1.7; }
  h1 { color: #4f46e5; border-bottom: 3px solid #4f46e5; padding-bottom: 8px; }
  h2 { color: #4338ca; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-top: 40px; }
  h3 { color: #1f2937; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
  th { background: #eef2ff; }
  img { max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        display: block; margin: 12px 0; }
  blockquote { border-left: 4px solid #4f46e5; background: #eef2ff;
               padding: 10px 16px; margin: 12px 0; border-radius: 0 8px 8px 0; }
  code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
  pre { background: #1f2937; color: #e5e7eb; padding: 14px; border-radius: 8px; overflow-x: auto; }
  ul li, ol li { margin: 4px 0; }
</style>
</head>
<body>
""" + html_body + """
<footer style="margin-top:60px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
  AVT 听损儿童康复训练平台 · 功能演示 · 由 Reasonix 生成
</footer>
</body>
</html>"""

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

print("已生成自包含 HTML:", html_path)
print("大小: %.1f MB" % (os.path.getsize(html_path) / 1024 / 1024))
