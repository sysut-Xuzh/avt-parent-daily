# AVT 听损儿童 AI 多模态康复训练平台
# 大创推进 · 完备执行计划（V4.0 详版）

> 版本：V4.0 · 2026-08-11
> 依据：V3.0 定案版 + 用户决策 + 市场调研 + 代码现状核查
> 用途：作为项目组后续按部就班执行的总纲
> 配套文件：`DAXUANG-EXECUTION-PLAN.md`（V3.0 摘要版）、`FUNCTION-DEMO.md`（演示文档）

---

# 第一部分 项目总览

## 1.1 项目一句话

面向 0-6 岁听损儿童 AVT（听觉口语法）康复训练的家长辅助平台——
通过「治疗师布置方案 → 家长按卡片执行 → 数据自动沉淀 → 治疗师追踪」的闭环，
把治疗师每周 1-2 小时的专业指导，延伸到家长每天 14-15 小时的日常训练中。

## 1.2 大创定位

- 参赛类型：大学生创新创业训练计划（国创计划）—— **创新训练项目**（软件类）
- 申报时间：每年春季 3-5 月（校级→省级→国家级逐级推荐）
- 项目周期：1-2 年（须毕业前结题）
- 结题要求：可运行系统演示 + 结题报告 + 成果（软著/论文/专利）
- 项目经费参考：创新训练 ≥2 万元/项（国家级）

## 1.3 核心创新点（申报书用）

1. **AI 多模态统一叙事**：听觉输入 → 视觉辅助 → AI 叙事引擎 → 互动反馈 四层协同
2. **32 项 AVT 活动动画库**：每项活动独立示范动画 + 分镜时间表 + 配音
3. **JITAI 智能推送**：正确时间推送正确话术，跳过自动降频
4. **音画分离同步技术**：分镜时间表驱动，配音独立于视频生成，同步可控
5. **家长-治疗师协作闭环**：家庭码关联 + 数据回流 + 治疗师远程追踪

---

# 第二部分 现状盘点（已核实）

| 模块 | 状态 | 详情 |
|------|------|------|
| 家长端 | ✅ 完整 | 今日清单/动画演示/打卡/录音/日历/小结/周故事/离线队列 |
| 治疗师端 | ✅ 完整 | 32 活动配置/宝宝管理/数据面板 |
| 数据库 | ✅ 14 张表 | Supabase 已部署；RLS+触发器+自动报告函数就绪 |
| 动画 | ✅ 36 个 mp4 | 32 活动全覆盖；**前 10 条无音轨** |
| 语音 | ⚠️ 部分 | 4 个旧 mp3 + 7 个新 mp3（TTS 音色待升级） |
| PWA | ⚠️ 半成品 | manifest+sw.js 有；图标 SVG（需 PNG）；缺 screenshots |
| 入口 | ⚠️ 二选一 | 首页需选身份（应改登录后直达） |
| 登录 | ❌ 无 | 需手机号/微信登录 |
| 部署 | ❌ 未部署 | 备案暂缓（老师后续购买） |
| 社区 | ❌ 无 | 远期规划 |
| 评估模块 | ❌ 无 | P2 加分项 |

---

# 第三部分 八条意见定案详案

## 意见 1：入口分开 → 手机号/微信登录 + 家庭码体系

### 产品逻辑
用户不需要懂 Supabase。用户只见"手机号验证码 / 微信登录"→ 系统后台自动创建账号 → 分配"家庭码"关联数据。

### 技术方案

**1) 登录页 `/login`**
```
┌─────────────────────────┐
│   👂 AVT 康复训练平台    │
│                         │
│  [请输入手机号]          │
│  [获取验证码]            │
│  [  登  录  ]            │
│  ── 或 ──               │
│  [ 微信一键登录 ]        │
│  [ 进入家长端 ]          │
│  [ 进入治疗师端 ]        │
└─────────────────────────┘
```
- 角色选择放登录页内（家长/治疗师两个入口按钮）
- 手机号验证码：Supabase Auth `signInWithOtp({ phone })`
- 微信登录：Supabase Auth OAuth（wechat），**资质要求**：需微信开放平台账号（个人主体可申请但受限）—— 若未获批，先用手机号登录，微信按钮置灰"即将开放"

**2) 数据库新表 `families`**
```sql
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,        -- 家庭码，如 "AVT-3F7K"
  baby_id UUID NOT NULL REFERENCES babies(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('parent','therapist')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, user_id)
);
```
- 治疗师创建家庭码 → 家长输入家庭码加入 → 双方通过 `baby_id` 共享数据
- 首次登录自动生成 `families` 关联当前宝宝的家长

**3) RLS 改造**
- 现有策略按 `parent_id = auth.uid()` 隔离 → 需扩展为"家庭码成员可见"
- 方案：新增 `auth.my_baby_ids()` 同时包含 `babies.parent_id` 和 `family_members` 关联的宝宝

### 实施步骤
| 步骤 | 涉及文件 | 验收 |
|------|---------|------|
| S1. 建 families/family_members 表 | supabase/migrations/005_families.sql | SQL 执行成功 |
| S2. 登录页 UI | src/app/login/page.tsx | 页面可访问 |
| S3. Supabase Auth 接入 | src/lib/auth.ts + login 页 | 手机号能收到验证码 |
| S4. 家庭码创建/加入 | src/app/api/families/route.ts | 治疗师建码、家长入码 |
| S5. RLS 改造 | supabase/migrations/006_rls_families.sql | 家庭成员互相可见 |
| S6. 入口跳转改造 | src/app/page.tsx → 登录后 redirect | 登录后直达对应端 |

---

## 意见 2：PWA 完善 → 手机 app + 电脑桌面 app

### 现状核查结果
- ✅ manifest.json 存在（display: standalone, start_url: /parent）
- ✅ sw.js 存在
- ✅ PWAInit 组件注册 sw.js
- ❌ 图标是 SVG（iOS/安卓要求 PNG）
- ❌ 无 screenshots 字段（安卓安装提示需要）

### 技术方案
**1) PNG 图标生成**（192/512/maskable）
- 用脚本把现有 SVG 转 PNG，或重新设计图标
- maskable 图标需留安全边距（内容占 80% 圆形区域）

**2) manifest.json 完善**
```json
{
  "name": "AVT 听损儿童康复训练",
  "short_name": "AVT训练",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#fafafa",
  "theme_color": "#6366f1",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/home.png", "sizes": "1080x1920", "type": "image/png" }
  ]
}
```

**3) sw.js 缓存策略**
- precache：首页 + 核心 JS/CSS
- runtime cache：动画文件按需缓存（第一播放后离线可用）
- 更新策略：新版本发布时 skipWaiting + 提示刷新

**4) iOS 兼容**
- apple-touch-icon 必须 PNG
- apple-mobile-web-app-capable meta 已有 ✅

### 验收
- 手机 Chrome：菜单 → 添加到主屏幕 → 全屏 app
- 电脑 Edge/Chrome：地址栏出现安装图标 → 桌面 app
- Lighthouse PWA 评分 ≥ 90

---

## 意见 3：音画同步 → 默认有声 + 分镜时间表驱动（核心工程）

### 根因（已从代码证实）
```
src/components/animation-modal.tsx 原逻辑：
  videoMuted 默认 true（为绕过浏览器自动播放策略）
  → 打开动画视频静音，用户听不到原声
  → 旧 TTS 播放逻辑已被删除，只剩手动点击取消静音
  → 表现 = "每次都要重新插入声音 / 声音被覆盖"
```
✅ **已修复**：`videoMuted` 默认改 false + 打开时强制 `play()`（弹窗由用户点击打开=有用户手势，可带声自动播放）

### 完整方案：分镜时间表（音画分离同步）

**核心思想**：视频画面如何生成都不影响同步——app 端用"分镜时间表"统一调度配音/字幕/环境音。

**1) 数据结构 `src/data/activity-audio-timeline.ts`**
```typescript
export interface AudioClip {
  id: string;
  activityId: string;    // 关联活动 ID
  shotIndex: number;     // 分镜 0-3
  startSec: number;      // 视频内开始秒
  endSec: number;
  audioUrl: string;      // 配音文件（Supabase Storage 或 public/audio）
  subtitle: string;      // 该分镜字幕
  envAudio?: string;     // 环境音（可选，如水声）
}

// 统一分镜时长（与 workbuddy 约定）：开场3s / 示范6s / 等待4s / 鼓励3s = 16s
export const SHOT_TIMING = [3, 6, 4, 3];

// 32 个活动的分镜表（每个活动 4 条 AudioClip）
export const ACTIVITY_TIMELINES: Record<string, AudioClip[]> = { ... };
```

**2) AnimationModal 改造**
```typescript
// 视频 timeupdate → 查时间表 → 当前分镜 → 播配音+字幕+环境音
const handleVideoTimeUpdate = () => {
  const t = videoRef.current?.currentTime ?? 0;
  const clips = ACTIVITY_TIMELINES[activityId] || [];
  const clip = clips.find(c => t >= c.startSec && t < c.endSec);
  if (clip && clip.id !== lastClipId.current) {
    lastClipId.current = clip.id;
    playAudio(clip.audioUrl);       // 真人/TTS 配音
    setSubtitle(clip.subtitle);     // 字幕跟随
    if (clip.envAudio) playEnvAudio(clip.envAudio); // 环境音
  }
};
```

**3) 配音生成流程（高质量 TTS）**
```
32 活动 × 4 分镜 = 128 句台词（按策略复用后约 64 条）
→ 高质量 TTS：Azure Neural（zh-CN-XiaoxiaoNeural 女声）或 ElevenLabs 中文
→ 输出 MP3 → 上传 Supabase Storage（public/audio/）
→ 时间表引用永久 URL
```

**4) 环境音轨**（意见 5）
- 洗澡 → 水声、出门 → 车流声、睡前 → 轻音乐盒
- 在分镜表 envAudio 字段引用环境音文件

### 实施步骤
| 步骤 | 涉及文件 | 验收 |
|------|---------|------|
| S1. 默认有声修复 | animation-modal.tsx | ✅ 已完成，构建通过 |
| S2. 分镜时间表数据结构 | src/data/activity-audio-timeline.ts | TS 编译通过 |
| S3. AnimationModal 时间表驱动 | animation-modal.tsx | 播放 10 次偏差 <0.5s |
| S4. 32 条配音生成 | 脚本 + Storage | 音频库齐全 |
| S5. 环境音轨 | 时间表 envAudio | 洗澡能听到水声 |
| S6. 音画一致验收 | 实测 | 台词与画面动作对齐 |

---

## 意见 4：功能丰富 → 三阶段（P1/P2/P3）

### 市场调研对标结论
中文市场无"AVT 一站式平台"直接竞品；最接近：启音在线（AI评测+报告推荐）、MED-EL/Cochlear 设备工具、Hearoes（游戏化听觉训练）、MITA（自适应+进度图表）。

### P1 必做（核心差异化）
| 功能 | 对标 | 技术要点 |
|------|------|---------|
| 分级训练路径 | Hearoes | 环境音→Ling六音→音节→词→句，信噪比渐进；内容分级表 |
| 进度图表 | 通用标配 | 家长端周趋势/完成率/词汇掌握度可视化（Recharts） |
| 治疗师数据导出 | Word Vault | 周报 CSV/PDF 导出 |

### P2 加分（大创亮点）
| 功能 | 对标 | 技术要点 |
|------|------|---------|
| AI 发音评测→任务推荐 | 启音在线/MITA | 录音→评分（Web Speech 或第三方）→推荐目标词 |
| Ling's 六音检查 | Hearoes | 每日 6 音检查游戏化 |
| 里程碑问卷 | MED-EL LittlEARS | 0-6 岁听觉发育评估表 |

### P3 远期
| 功能 | 说明 |
|------|------|
| 家长社区 | 发帖/评论/专家答疑（需登录体系就绪） |
| 会员订阅 | 免费+高级内容（MITA $69.99/年范式） |

---

## 意见 5：背景音 → 环境音采纳，BGM 暂缓

### 定案
- ✅ 环境音：洗澡水声、出门车声、睡前音乐盒 → 走分镜时间表 envAudio
- ⚠️ BGM 暂缓：与 AVT"听觉优先"理念冲突，可能干扰目标音分辨；若加必须可关闭可调音量

---

## 意见 6：阿里云部署 → 备案暂缓，架构预留

### 用户决策
备案暂时不做，等老师后续购买域名后正式上线。

### 分期
| 阶段 | 方案 |
|------|------|
| A（现在） | Vercel 免费部署（免备案）—— 顶住演示/试用 |
| B（老师购买后） | 阿里云 ECS + 域名 + ICP 备案 + HTTPS |
| C（远期） | 社区上线（依赖登录体系） |

### 阿里云架构（预留）
```
用户 → 阿里云ECS(公网IP) → Nginx(443 SSL) → PM2 → Next.js standalone
                                                ↘ Supabase（云）或阿里云 RDS
```

---

## 意见 7：YouTube 学习 → 内容参考

- 抓取外网 AVT 训练视频/文案 → 提炼话术模板、分镜设计、分级路径
- 版权注意：学习结构/话术，不搬运成品素材
- 产出：`docs/avt-research-notes.md`（分镜/话术参考库）

---

## 意见 8：大创推进 → 创新训练项目

### 时间线（已核实）
- 每年春季 3-5 月校内申报 → 省级推荐 → 教育部审核公布国家级
- 周期 1-2 年，须毕业前结题
- 结题：系统演示 + 结题报告 + 成果佐证（软著/论文）

### 材料清单
| 材料 | 状态 | 负责 |
|------|------|------|
| 项目申报书 | 需写 | 团队 |
| 可运行系统 | ✅ 有，需升级 | 开发 |
| 演示视频（3-5min） | 需拍 | 团队 |
| 软著申请 | 需申请 | 团队 |
| 论文（可选） | 数据报告分析 | 团队 |

### 申报书创新点框架（可复用）
1. AI 多模态统一叙事（听→视→AI→反馈）
2. 32 项 AVT 活动动画库 + 音画分离同步
3. JITAI 智能推送（对的时间推对的话术）
4. 家长-治疗师协作闭环（家庭码 + 数据回流）

---

# 第四部分 分阶段执行计划（详细）

## 阶段一：地基加固（暑假集中期）

| # | 任务 | 子步骤 | 涉及文件 | 验收 |
|---|------|--------|---------|------|
| 1.1 | 动画默认有声 | 改 muted 默认值 | animation-modal.tsx | ✅ 已完成 |
| 1.2 | 分镜时间表框架 | 数据结构+驱动逻辑 | activity-audio-timeline.ts, animation-modal.tsx | 编译+播放同步 |
| 1.3 | 32 条配音生成 | TTS→Storage→时间表 | 脚本+storage | 音频齐全 |
| 1.4 | 登录页+Auth | 页面+手机号验证码 | login/page.tsx, lib/auth.ts | 能登录 |
| 1.5 | 家庭码体系 | families 表+API | migrations/005, api/families | 建码/入码 |
| 1.6 | RLS 改造 | 家庭成员可见 | migrations/006 | 数据隔离正确 |
| 1.7 | PWA 完善 | PNG图标+screenshots+sw | manifest.json, icons/ | 可安装 |
| 1.8 | 入口跳转 | 登录后直达 | page.tsx | 角色分流 |
| 1.9 | Vercel 部署 | 环境变量+部署 | vercel.json | 公网可访问 |
| 1.10 | 分级训练路径 | 内容分级表 | data/levels.ts | 可切换难度 |

## 阶段二：功能深化（开学后周末）

| # | 任务 | 子步骤 | 验收 |
|---|------|--------|------|
| 2.1 | 进度图表 | Recharts 周趋势/完成率 | 图表渲染真实数据 |
| 2.2 | 治疗师数据导出 | CSV/PDF 周报 | 导出文件可打开 |
| 2.3 | Ling's 六音游戏化 | 每日检查交互 | 完成检查记录 |
| 2.4 | 里程碑问卷 | 0-6 岁评估表 | 问卷可提交 |
| 2.5 | AI 发音评测 | 录音评分+推荐 | 评分返回 |

## 阶段三：大创冲刺（申报前 1 个月）

| # | 任务 | 产出 |
|---|------|------|
| 3.1 | 申报书撰写 | 项目申报书 |
| 3.2 | 演示视频 | 3-5 分钟 |
| 3.3 | 软著申请 | 著作权证书 |
| 3.4 | 功能打磨 | 稳定性+完整闭环 |
| 3.5 | 大创材料包 | 申报书+PPT+视频 |

## 阶段四：扩展（获奖后/长期）

| # | 任务 | 产出 |
|---|------|------|
| 4.1 | 家长社区 | 发帖/评论/专家答疑 |
| 4.2 | 阿里云正式部署 | 备案后上线 |
| 4.3 | 商业化探索 | 免费+订阅 |
| 4.4 | 论文/专利 | 学术成果 |

---

# 第五部分 技术架构规划

## 5.1 目标架构
```
┌─────────────────────────────────────────────┐
│          前端 (Next.js 14 App Router)         │
│  /login → /parent(家长端) /therapist(治疗师端) │
│  PWA：手机/电脑可安装                        │
├─────────────────────────────────────────────┤
│            API 路由层 (/api/*)               │
│  auth / families / tasks / progress / ...    │
├─────────────────────────────────────────────┤
│            Supabase (PostgreSQL)             │
│  14表 + families + Auth + Storage + RLS      │
├─────────────────────────────────────────────┤
│        多媒体 (public/animations + Storage)  │
│  32动画MP4 + 配音MP3 + 环境音 + 封面PNG       │
└─────────────────────────────────────────────┘
```

## 5.2 新增依赖
- `@supabase/auth-helpers-nextjs`（登录）
- `recharts`（进度图表，P2）
- `azure-cognitiveservices-speech` 或 TTS API 脚本（配音生成，开发期）

## 5.3 数据库迁移清单
| 迁移 | 内容 | 状态 |
|------|------|------|
| 001_schema | 14 张核心表 | ✅ 已执行 |
| 002_rls | 基础 RLS | ✅ 已执行 |
| 003_functions | 触发器/报告函数 | ✅ 已执行 |
| 004_indexes | 性能索引 | ✅ 已执行 |
| 005_families | families + family_members | 待执行 |
| 006_rls_families | 家庭成员 RLS | 待执行 |
| 007_media_columns | tasks 媒体列（如未加） | 视情况 |

---

# 第六部分 里程碑时间表

| 里程碑 | 时间 | 内容 | 验收 |
|--------|------|------|------|
| M1 地基完成 | 暑假末 | 登录+家庭码+PWA+音画同步+Vercel 部署 | 全部可演示 |
| M2 功能深化 | 开学后 2-3 个月 | 分级路径+图表+导出+六音 | P1 完成 |
| M3 大创申报 | 春季申报前 | 申报书+视频+软著 | 材料齐全 |
| M4 结题/扩展 | 1-2 年 | 社区+正式部署+成果 | 结题验收 |

---

# 第七部分 团队分工建议

| 角色 | 职责 | 对应模块 |
|------|------|---------|
| 前端开发 ×1 | 页面/组件/交互 | 登录、PWA、动画驱动、图表 |
| 后端/数据 ×1 | API/Supabase/RLS | 家庭码、Auth、数据导出 |
| 内容/产品 ×1 | 台词/分镜/配音/文档 | 时间表、TTS、申报材料 |
| 测试/演示 ×1（可兼） | 验收/视频/文档 | 演示视频、结题材料 |

---

# 第八部分 风险与应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 微信 OAuth 资质未批 | 中 | 登录受阻 | 先用手机号验证码，微信后补 |
| TTS 音色仍偏机械 | 中 | 体验 | Azure Neural 接近真人；可换真人录 |
| 浏览器自动播放限制 | 低 | 无声 | 用户手势弹窗已验证可行 |
| 备案周期长 | 高 | 延误上线 | Vercel 过渡（已定案） |
| 大创材料多 | 中 | 时间压力 | 模板提前准备 |
| 动画文件缺失/命名错 | 中 | 播放失败 | 三级回退机制已实现 |
| 社区合规风险 | 中 | 法律 | 社区先做只读+专家回复 |

---

# 第九部分 交付物清单

## 代码
- [ ] Next.js 平台（家长端/治疗师端/登录）
- [ ] Supabase 迁移（14+2 表）+ RLS
- [ ] 分镜时间表 + AnimationModal 驱动
- [ ] PWA（可安装）

## 内容
- [ ] 32 活动配音库 + 环境音
- [ ] 分级训练内容（环境音→六音→词→句）
- [ ] 话术模板库（YouTube 学习产出）

## 文档
- [ ] 项目申报书
- [ ] 功能演示文档（FUNCTION-DEMO.md）✅ 已有
- [ ] 使用说明（README.md）✅ 已有
- [ ] 演示视频
- [ ] 软著材料

---

# 第十部分 立即执行清单（下一步）

| 优先级 | 任务 | 预估耗时 | 依赖 |
|--------|------|---------|------|
| P0 | ✅ 动画默认有声（已完成） | 已完 | - |
| P0 | 分镜时间表数据结构 | 1-2 天 | - |
| P0 | 登录页 + 手机号验证码 | 2-3 天 | Supabase Auth 配置 |
| P0 | PWA PNG 图标 + screenshots | 半天 | - |
| P1 | 32 条配音生成 | 2-3 天 | 时间表结构 |
| P1 | 家庭码体系 | 1-2 天 | 登录 |
| P1 | Vercel 部署 | 半天 | 登录+入口 |
| P2 | 分级训练路径 | 3-5 天 | - |

---

> 本文档为总纲。每个任务开工前，建议按"子步骤→验收"粒度拆成独立开发任务单（可复用第四部分表格）。
> 有任何模块需要展开成更细的开发任务单，随时告知。
