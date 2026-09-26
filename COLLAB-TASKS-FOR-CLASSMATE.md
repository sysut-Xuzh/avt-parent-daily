# 同学协作指南（视觉方向由你决定）

你是**视觉 / 前端美化**负责人。本文件只讲**协作规则**——具体长什么样、配色、插画风格，**全部由你定**，我不替你规定。

> 配套读：`COLLAB.md`（分工总表）、`COLLAB-RUNBOOK.md`（怎么拉代码 / 提交 / 合并）。

---

## 一、你能改的文件（你的地盘）
- `src/app/globals.css` —— 设计系统、样式类、字体
- `tailwind.config.js` —— 颜色 / 字体 token
- 所有页面的**视觉部分**（className、布局样式、组件外观）
- `src/components/**` 的视觉
- `public/assets/**` —— 你出的图放这里

> 仓库里**可能已有**一套样式类（如 `globals.css` 里的 `.ft-*`），你可以：沿用、扩展、或按你的方案**重写**。若选择重写，请先在群里和徐说一声，避免两人互相覆盖同一段 CSS。

## 二、你不能碰的文件（归徐子涵，动了会冲突或破坏功能）
- `src/app/api/**` —— 所有后端接口
- `src/app/login/page.tsx` 的**注册 / 登录逻辑**
- `src/lib/**`、`src/data/**` —— 业务与数据逻辑
- `next.config.js`、部署脚本、`.env*`
- 治疗师上传等后端功能逻辑

## 三、不冲突的纪律（最重要）
1. **只在 `visual-revamp` 分支工作**，绝不直接 push `main`。
2. **不要 `git add -A` / `git add .` 全量添加**；只 `add` 你真的改过的文件，避免把别人的或垃圾文件带进去。
3. JSX 里尽量用 `globals.css` 里的样式类，**少写内联 `style`**；这样徐改逻辑时不会和你撞同一行。
4. 改 `globals.css` / `tailwind.config.js` 这类**公共文件**前，先在群里同步。
5. 若发现两人都要动同一个文件，先沟通好谁改哪一部分再动手。

## 四、怎么开始 / 日常（详见 RUNBOOK）
```bash
git clone <仓库地址>
git checkout visual-revamp
# 改视觉……
git add <你改的文件>
git commit -m "style: 你的改动说明"
git push origin visual-revamp
```

## 五、怎么自测
```bash
npm install
npm run dev        # 浏览器开 http://localhost:3000 看页面效果
```
类型检查 / 生产构建由徐负责，你不必跑 `tsc` / `next build`。
