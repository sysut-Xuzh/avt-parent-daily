# AVT 听损儿童 AI 多模态康复训练平台
# 大创推进 · 完善与升级执行方案（V3.0 定案版）

> 版本：V3.0 · 2026-08-11
> 状态：八条意见已全部定案，可执行
> 前版：V2.0（草案）→ V3.0 融入用户决策

---

## 第一部分：现状盘点（已核实）

| 模块 | 现状 | 关键发现 |
|------|------|---------|
| 家长端 | ✅ 完整 | 今日清单/动画/打卡/录音/日历/小结 |
| 治疗师端 | ✅ 完整 | 32活动配置/数据面板 |
| 数据库 | ✅ 14张表 | Supabase 已部署，RLS+触发器就绪 |
| 动画 | ✅ 36个mp4 | 前10条无音轨；**音画不同步根因=视频默认静音** |
| PWA | ⚠️ 半成品 | manifest+sw.js有，图标是SVG、缺screenshots |
| 入口 | ⚠️ 二选一 | 需改为登录后直达 |
| 登录 | ❌ 无 | 需微信/手机号登录体系 |
| 部署 | ❌ 未部署 | 备案暂缓（老师后续购买） |
| 社区 | ❌ 无 | 远期 |
| 评估 | ❌ 无 | 加分项 |

---

## 第二部分：八条意见定案（融入用户决策）

### 意见1：入口分开 ✅ 定案：微信/手机号登录 + 代号体系
**用户决策**：很多人没有 Supabase → 用微信/手机号等常见方式登录 → 系统分配唯一代号 → 自动关联该用户的数据。

**方案澄清（关键）**：用户不需要懂 Supabase，**Supabase Auth 本身支持微信 OAuth 和手机号验证码登录**。"代号"设计为**家庭邀请码**：

```
用户打开 → 微信/手机号登录（Supabase Auth，用户无感知）
  → 系统自动创建用户档案（内部 user_id，用户不可见）
  → 家长/治疗师通过"家庭码"关联（如 8位码：AVT-3F7K）
  → 数据按 user_id + baby_id 隔离，全程用户不需要理解 Supabase
```

**技术路线**：
- 登录：Supabase Auth（`signInWithOtp` 手机号验证码 / 微信 OAuth）
- 家庭码：新建 `families` 表存家庭码，家长/治疗师通过家庭码关联到同一 baby
- 代号：用户首次登录系统分配（显示一次，可抄写保存）

**实施**：
1. 新增 `/login` 页（手机号验证码 + 微信按钮）
2. 新增 `families` 表（家庭码 + 成员关系）
3. 改造 RLS：按 user_id 隔离，家庭码成员可见
4. 家长/治疗师入口：登录后按角色直达 `/parent` 或 `/therapist`

### 意见2：PWA 完善 ✅ 定案：按推荐方案做
现有：manifest.json ✅ + sw.js ✅ + PWAInit ✅
**补**：
1. PNG 图标（192/512/maskable）替换 SVG
2. manifest 加 `screenshots`
3. sw.js 缓存策略验证
4. 电脑端 Edge/Chrome 安装为桌面 app；手机端"添加到主屏幕"
5. Lighthouse ≥ 90

### 意见3：音画同步 ✅ 定案：修复"声音被覆盖" + 分镜时间表
**用户反馈根因（已从代码证实）**：
```
AnimationModal 第36行：videoMuted 默认 true（浏览器自动播放策略）
→ 打开动画视频是静音的，用户听不到原声
→ 旧版 TTS 播放逻辑已被删除，只剩手动点击取消静音
→ 表现即"每次都要重新插入声音 / 声音被覆盖"
```

**修复方案（三层）**：
1. **默认有声**：弹窗是用户点击按钮打开的（有用户手势）→ 视频可默认取消静音自动播放，绕开自动播放限制
2. **配音持久化**：高质量 TTS 生成的音频存 Supabase Storage，任务存永久 URL（不再被回退替换）
3. **分镜时间表驱动**（音画同步核心）：
   - 32 个活动配 `activity-audio-timeline.ts`：4 分镜固定时长（3s/6s/4s/3s = 16s）
   - 视频 `onTimeUpdate` → 查时间表 → 播对应音频 + 字幕
   - 视频画面如何生成都不影响同步（时间表在 app 端可控）

**实施步骤**：
1. 改 AnimationModal：视频默认有声（`muted=false`）+ 保留静音按钮
2. 建 `activity-audio-timeline.ts` 数据结构
3. 高质量 TTS（Azure Neural/ElevenLabs 中文女声）生成 32 条核心配音 → Supabase Storage
4. AnimationModal 按时间表驱动

### 意见4：功能丰富 ✅ 定案：分三阶段（P1/P2/P3）
基于调研（启音在线/MED-EL/Hearoes/MITA）：
- **P1 必做**：分级训练路径、进度图表、治疗师数据导出
- **P2 加分**：AI 发音评测→任务推荐、Ling's 六音游戏化、里程碑问卷
- **P3 远期**：家长社区、会员订阅

### 意见5：背景音 ✅ 定案：环境音采纳，BGM 暂缓
- 加环境音（洗澡水声/出门车声/睡前音乐盒）→ 走分镜时间表的 envAudio 轨道
- BGM 与 AVT"听觉优先"冲突，暂缓；若加必须可关闭可调音量

### 意见6：阿里云+社区 ✅ 定案：备案暂缓，架构预留
**用户决策**：备案暂时不做，等老师后续购买。
- 阶段A：先用 Vercel 免费部署顶住演示（免备案）
- 阶段B：老师购买域名+阿里云后，走备案+正式部署（架构已预留：Nginx+PM2+standalone）
- 阶段C：社区（用户体系就绪后）

### 意见7：YouTube 学习 ✅ 定案：内容参考
- 抓取外网 AVT 视频/文案 → 提炼话术模板、分镜设计
- 注意版权：学习结构不搬运素材

### 意见8：大创推进 ✅ 定案：按创新训练项目
**已核实**：大创（国创计划）每年春季3-5月申报，校级→省级→国家级，周期1-2年，结题需系统演示+报告+成果（软著/论文）。
**材料**：申报书（创新点：AI多模态叙事+JITAI推送+32活动动画库+真人配音时间表）、可运行系统、演示视频、软著。

---

## 第三部分：分阶段执行计划（长期）

### 阶段一：地基加固（暑假集中期）
| # | 任务 | 产出 | 依赖 |
|---|------|------|------|
| 1.1 | 修复动画默认静音 → 视频原声可听 | AnimationModal 改造 | 无 |
| 1.2 | 分镜时间表框架 | activity-audio-timeline.ts | 1.1 |
| 1.3 | 高质量 TTS 生成 32 条配音 → Storage | 配音音频库 | 1.2 |
| 1.4 | 入口分开 + 微信/手机号登录 | /login + Supabase Auth | 无 |
| 1.5 | 家庭码体系（families 表） | 家庭关联 | 1.4 |
| 1.6 | PWA 完善（PNG图标+screenshots） | 可安装 | 无 |
| 1.7 | Vercel 部署（免备案过渡） | 公网可访问 | 1.4 |

### 阶段二：功能深化（开学后周末）
| # | 任务 | 产出 |
|---|------|------|
| 2.1 | 分级训练路径（环境音→六音→词→句） | 内容分级 |
| 2.2 | 进度图表（周趋势/完成率） | 家长可视化 |
| 2.3 | 治疗师数据导出 | 周报CSV/PDF |
| 2.4 | Ling's 六音游戏化 | 每日检查 |

### 阶段三：大创冲刺（申报前1个月）
| # | 任务 | 产出 |
|---|------|------|
| 3.1 | 申报书撰写 | 项目申报书 |
| 3.2 | 演示视频拍摄 | 3-5分钟 |
| 3.3 | 软著申请 | 著作权 |
| 3.4 | 功能打磨 | 完整闭环 |

### 阶段四：扩展（获奖后/长期）
| # | 任务 | 产出 |
|---|------|------|
| 4.1 | 家长社区 | 发帖/评论/专家 |
| 4.2 | AI 发音评测 | 录音评分 |
| 4.3 | 阿里云正式部署 | 备案后上线 |
| 4.4 | 商业化 | 免费+订阅 |

---

## 第四部分：关键技术方案

### 4.1 音画分离时间表（核心）
```typescript
// src/data/activity-audio-timeline.ts
export interface AudioClip {
  id: string;
  activityId: string;   // 关联活动
  shotIndex: number;    // 分镜 0-3
  startSec: number;     // 视频内开始秒
  endSec: number;
  audioUrl: string;     // Storage 里的配音（如 /storage/audio/act/shot1.mp3）
  subtitle: string;     // 字幕
  envAudio?: string;    // 环境音（可选）
}
export const SHOT_TIMING = [3, 6, 4, 3]; // 开场/示范/等待/鼓励=16s
```

### 4.2 AnimationModal 修复
```typescript
// 1. 默认有声（用户手势打开的弹窗可自动播放带声视频）
const [videoMuted, setVideoMuted] = useState(false); // ← 从 true 改 false

// 2. 视频 timeupdate → 时间表 → 播音频+字幕
onTimeUpdate = (video) => {
  const t = video.currentTime;
  const clip = timeline.find(c => t >= c.startSec && t < c.endSec);
  if (clip && clip.id !== lastClipId) {
    playAudio(clip.audioUrl);      // 真人/TTS配音
    setSubtitle(clip.subtitle);
    if (clip.envAudio) playEnv(clip.envAudio);
  }
};
```

### 4.3 登录体系（微信/手机号）
```typescript
// Supabase Auth 手机号验证码
await supabase.auth.signInWithOtp({ phone: "138xxxx", });

// 家庭码：families 表
interface Family {
  code: string;        // "AVT-3F7K"
  baby_id: string;
  members: string[];   // user_ids（家长+治疗师）
}
```

### 4.4 高质量 TTS 配音流程
```
台词文本（32条×分镜）→ Azure Neural TTS（zh-CN 女声，如 Xiaoxiao）
  → 输出 MP3 → 上传 Supabase Storage → 任务存永久 URL
```

---

## 第五部分：风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| 浏览器自动播放限制 | 视频默认无声 | 用户手势打开的弹窗可自动播（已验证可行） |
| 微信 OAuth 需资质 | 登录受阻 | 先用手机号验证码（Supabase内置），微信后补 |
| TTS 音色仍偏机械 | 体验 | Azure Neural 已接近真人；可后续换真人录 |
| 备案周期长 | 延误上线 | 备案前 Vercel 过渡（已定案） |
| 大创材料多 | 时间压力 | 模板提前准备 |

---

## 第六部分：验收标准（大创级）

- [ ] 家长/治疗师独立入口，微信/手机号登录后直达
- [ ] 家庭码关联（家长↔治疗师↔宝宝）
- [ ] PWA 手机+电脑可安装，Lighthouse ≥90
- [ ] 动画默认有声，音画一致（播放10次偏差<0.5s）
- [ ] 32活动配音+环境音齐全
- [ ] Vercel 公网可访问（备案后迁阿里云）
- [ ] 申报书+演示视频+软著齐全

---

## 附：立即执行的第一批任务（按依赖）

1. **修复动画默认静音**（改一行 `videoMuted=false`，立即可验收）—— 30分钟
2. **分镜时间表框架**（数据结构+AnimationModal驱动）—— 核心工程
3. **32条配音生成**（Azure Neural TTS → Storage）—— 与2并行
4. **登录页 + Supabase Auth**（手机号验证码）—— 独立
5. **PWA PNG图标+screenshots** —— 30分钟
6. **Vercel 部署**（登录+入口完成后）
