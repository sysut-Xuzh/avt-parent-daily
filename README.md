# AVT 听损儿童 AI 多模态康复训练平台 — 完整使用说明

> 面向：下载本项目并希望在本机运行、复现、二次开发的用户
> 版本：MVP / Week 1-2 交付版

---

## 一、项目是什么

面向 **0-6 岁听损儿童 AVT（听觉口语法）康复训练**的家长辅助平台。
治疗师每周只出现 1-2 小时，但家长每天需要执行 14-15 小时的训练。
本平台通过「治疗师布置方案 → 家长按卡片执行 → 数据自动沉淀」的方式降低家长执行负担。

**核心流程：**

```
治疗师端（Web）   →  配置 32 项训练活动、目标词、场景
        ↓ 保存
Supabase 数据库  →  weekly_plans + daily_plans + tasks（含动画/语音/录音字段）
        ↓ 读取
家长端（Web/手机） →  今日训练清单卡片 + 动画演示 + 打卡 + 录音
        ↓ 记录
数据回流          →  完成记录、跳过追踪、词汇掌握度、周报告
```

---

## 二、功能清单

### 1. 角色选择首页（`/`）
- 家长端入口：每日训练清单
- 治疗师端入口：方案配置工作台

### 2. 家长端（`/parent`）
| 功能 | 说明 |
|------|------|
| 今日训练清单 | 从数据库读取今日任务卡片（时间/场景/策略/目标词/话术） |
| 动画演示 | 点绿色播放按钮，弹出动画弹窗（视频原声 + 分镜步骤 + 台词字幕） |
| 标记完成 | 一键完成，进度条 + 庆祝动画 + Toast |
| 录音反馈 | 录制宝宝反应音频，记录家长情绪/宝宝反应 |
| 连续打卡 | 火焰打卡进度卡，显示今日/本周完成情况 |
| 成长日历 | 按月查看完成、录音、反馈记录 |
| 今日小结 / 周故事 | 自动生成的数据总结 |
| 离线队列 | 断网时操作存入本地，联网自动同步 |
| 旁白切换 | 动画播放时左下角按钮可切换「视频原声 ↔ app 旁白(TTS)」 |

### 3. 治疗师端（`/therapist`）
| 功能 | 说明 |
|------|------|
| 宝宝管理 | 选择宝宝（默认小宝） |
| 32 项训练活动库 | 按 6 大模块分组（听觉技能/核心策略/日常常规/游戏互动/设备管理/家长技巧） |
| 方案配置 | 每个活动选择类型 + 填目标词 + 选场景 |
| 保存方案 | 写入数据库，生成当日任务（保留已完成，删除过时任务） |
| 数据面板 | 查看宝宝训练数据总览 |

### 4. 家长设置（`/parent/settings`）
- 宝宝信息、偏好设置（免打扰时段、推送提前量等）

### 5. 后端 API（`/api/*`）
| 路由 | 功能 |
|------|------|
| `GET /api/tasks/today` | 今日任务（含动画路径动态解析） |
| `POST /api/tasks/complete` | 标记完成 |
| `POST /api/tasks/feedback` | 反馈（情绪/反应） |
| `GET /api/progress/today` | 今日/本周进度 + 连续打卡 |
| `POST /api/weekly-plans/save` | 保存治疗师方案并生成任务 |
| `GET /api/weekly-plans/current` | 当前方案 |
| `GET /api/babies` | 宝宝列表 |
| `GET /api/calendar` | 成长日历 |
| `GET /api/logs` | 训练日志 |
| `POST /api/recordings/upload` / `GET /api/recordings/list` | 录音上传/查询 |
| `GET /api/reports/daily-summary` / `weekly-story` | 数据总结 |
| `GET /api/dashboard` | 治疗师数据面板 |
| `POST /api/push/subscribe` / `check` / `send` | 推送订阅/检查/发送 |
| `POST /api/tasks/generate` | LLM 生成任务（预留，需配置 API Key） |

---

## 三、技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | Next.js 14 (App Router) + React 18 |
| 语言 | TypeScript |
| 样式 | Tailwind CSS |
| 动画 | Framer Motion |
| 数据库 | Supabase (PostgreSQL) |
| 动画文件 | MP4 (H.264) + PNG 封面 + MP3 语音 |
| 构建 | `next build`（SSR + 动态 API 路由） |

---

## 四、快速开始（本地运行）

### 前提
- Node.js ≥ 18
- npm

### 步骤

```bash
# 1. 进入项目目录
cd avt-parent-daily

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 复制 .env.local.example 为 .env.local，填入自己的 Supabase 凭据
cp .env.local.example .env.local

# 4. 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:3000`（若 3000 被占用会自动用 3001）。

---

## 五、Supabase 数据库配置

### 1. 创建项目
- 打开 [supabase.com](https://supabase.com) → New project
- 记下 **Project URL** 和 **anon public key**（Project Settings → API）

### 2. 执行 SQL 迁移
在 Supabase **SQL Editor** 中按顺序执行：

| 文件 | 内容 |
|------|------|
| `supabase/migrations/001_schema.sql` | 建 14 张表 |
| `supabase/migrations/002_rls.sql` | 行级安全策略 |
| `supabase/migrations/003_functions.sql` | 自动函数/触发器 |
| `supabase/migrations/004_indexes.sql` | 性能索引 |
| `supabase/seed.sql` | 种子数据（测试家庭/治疗师/任务） |

> 若 tasks 表报"缺少列"，执行：
> ```sql
> ALTER TABLE tasks
>   ADD COLUMN IF NOT EXISTS activity_type TEXT,
>   ADD COLUMN IF NOT EXISTS animation_url TEXT,
>   ADD COLUMN IF NOT EXISTS speech_text TEXT,
>   ADD COLUMN IF NOT EXISTS audio_url TEXT;
> ```

### 3. 填入 .env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的anon key
```

### 4. 首次使用流程
1. 打开 `/` → 点「治疗师端」
2. 选择宝宝（种子数据里有小宝/朵朵/乐乐）
3. 配置训练活动 + 目标词 → 保存方案
4. 打开 `/parent` → 看到今日任务卡片

---

## 六、动画文件说明

### 目录
`public/animations/` — 32 个训练活动动画（MP4）+ 封面（PNG）+ 语音（MP3）

### 命名规范
`{activityId}.mp4`，如 `sound-detection.mp4`、`mealtime.mp4`

### 回退机制
代码（`/api/tasks/today`）在服务端检查动画文件是否存在，按三级回退：
1. 新命名文件（`{activityId}.mp4`）
2. 旧拼音文件（`mingming-dengdai-pingguo.mp4` 等，兼容早期版本）
3. 通用占位动画（`tingjue-xianxing-shui.mp4`）

缺文件时页面**不会白屏**，会显示角色动画 + 分镜步骤文字。

### 音频模式
- 视频默认播放**自带音轨**（原声）
- 左下角按钮可切换「原声 ↔ app 旁白(TTS)」
- 配音要求：前 8 条用自然年轻妈妈声音（详见 `ANIMATION-PRODUCTION-GUIDE.md`）

---

## 七、项目结构

```
avt-parent-daily/
├── src/
│   ├── app/                    # 页面 + API 路由
│   │   ├── page.tsx            # 角色选择首页
│   │   ├── parent/             # 家长端
│   │   ├── therapist/          # 治疗师端
│   │   └── api/                # 后端接口
│   ├── components/             # UI 组件
│   ├── data/                   # 活动库/语音/数据定义
│   ├── lib/                    # 工具库（Supabase、推送、调度）
│   ├── machines/               # XState 状态机
│   └── types/                  # TypeScript 类型
├── public/
│   └── animations/             # 32 个训练动画 + 语音
├── supabase/
│   ├── migrations/             # 数据库迁移 SQL
│   └── seed.sql                # 种子数据
├── ANIMATION-PRODUCTION-GUIDE.md   # 动画制作指令（给动画工具）
└── package.json
```

---

## 八、常见问题

| 问题 | 解决 |
|------|------|
| 页面显示"今天还没有训练任务" | 数据库没数据 → 先去治疗师端保存方案 |
| 动画点开没有画面 | 动画文件缺失 → 检查 `public/animations/` 是否有对应 mp4 |
| 声音是机械的 | 视频无音轨 + app TTS 兜底 → 给视频补自然配音 |
| `npm run dev` 提示端口占用 | 会自动换端口，看终端提示的 Local 地址 |
| API 报 `Supabase xxx` 错误 | 检查 `.env.local` 的 URL/Key 是否正确 |
| 修改代码不生效 | 开发模式热更新；改了 API 路由需重启 dev server |

---

## 九、已知限制（MVP 阶段）

- 无真实登录系统，宝宝通过 `baby_id` 参数隔离（默认小宝）
- LLM 任务生成（`/api/tasks/generate`）需自行配置 `LLM_API_KEY`
- Web Push 推送需配置 VAPID 密钥（`.env.local` 中）
- 部分动画文件可能缺失配音，待补充
