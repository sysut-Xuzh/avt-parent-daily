# 协作分工说明（双人并行开发，避免冲突）

项目：avt-parent-daily
基线分支：`main`（已含 A 旅程页 + E 视觉验证片 + B 治疗师布置修复）
长期分支：
- `visual-revamp`  ← 同学（视觉 / 前端美化）
- `backend-auth`   ← 徐子涵（后端 / 注册+三者对应 / 治疗师上传 / 部署）

> 两人各自在自己的分支上提交、push；**绝不直接 push `main`**。最后再分别合回 `main`。

---

## 一、文件职责划分（谁改谁负责，互不碰对方文件）

### 同学（visual-revamp）可改
- `src/app/globals.css` —— 设计系统、`.ft-*` 类、关键帧、字体（**她的主场，徐子涵勿动**）
- `tailwind.config.js` —— 颜色 / 字体 token
- `src/components/bottom-nav.tsx`
- `src/components/task-card.tsx`
- `src/components/greeting-header.tsx` / `streak-card.tsx`
- `src/components/journey/JourneyMap.tsx`
- `public/assets/**` —— AI 生成的 SVG / PNG（角色 / 场景横幅 / 图标）
- 各 `page.tsx` 的 **className 字符串**（只改样式，不改动结构与逻辑）

### 徐子涵（backend-auth）可改
- `src/app/api/**` —— 所有接口
- `src/app/login/page.tsx` —— 注册 / 登录逻辑
- `src/lib/**` —— 数据 / 服务逻辑
- `src/data/**` —— 内容 / 种子数据
- `next.config.js` / `vercel.json` / 部署脚本
- `src/app/therapist/page.tsx` —— **上传逻辑**（视觉样式由同学负责）
- `src/app/parent/page.tsx` —— **仅逻辑 / 结构**（样式只用 `.ft-*` 语义类名，**不写内联颜色值**）

---

## 二、共识纪律
1. 各自只在自己的分支提交、push；不要直接 push `main`。
2. 改公共文件（`types`、`package.json` 依赖）前先在群里说一声。
3. `parent/page.tsx`：徐只写 `.ft-*` 语义类名（不写内联颜色），同学在 `globals.css` 里完善样式 → 永不冲突。
4. 每天结束前 `git pull --rebase origin main` 保持同步。
5. 合并前开 PR / 让对方看一眼再合。

---

## 三、合并顺序（上线前）
`main` ← `visual-revamp` 与 `backend-auth` 分别合入（无冲突则任意顺序）：
```bash
git checkout main
git merge visual-revamp
git merge backend-auth
git push origin main
```

---

## 四、给同学的上手提示
- 你已有的 `.ft-*` 设计令牌（`ft-card` / `ft-btn-primary` / `ft-capsule-nav` / `font-hand` / `ft-pulse-ring` 等）就是视觉基础，请**在其上扩展**，不要从零重做。
- 配色规范：主色蓝 `#4A90B6`、强调珊瑚 `#E8956A`、奶油底 `#FAF6F0`（详见 globals.css 与 A–E 方案文档）。
- 真实手绘素材（角色 / 场景横幅 / 图标）用 AI 工具（豆包 / 即梦 / Midjourney）出图后放 `public/assets/`，再在 CSS 里引用。
