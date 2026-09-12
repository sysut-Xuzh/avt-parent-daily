# 📍 给 work Buddy：动画文件存放指令

## 一、存放位置（唯一正确的目录！）

请把生成的所有动画视频文件**实际写入**这个目录：

```
C:\Users\徐子涵\AppData\Roaming\reasonix\global-workspace\avt-parent-daily\public\animations\
```

> ⚠️ 之前你报告"已生成 23 个动画"，但项目目录里实际只有 11 个 mp4、**0 个 _preview 文件**。
> 说明文件没有真正放到这个路径（可能在别的目录）。请**确认文件真的写入上述目录**，并逐个列出你放入的文件名。

---

## 二、需要你放入的文件（按新命名规范）

文件名为**英文活动 ID**，格式 `{activityId}.mp4`。

### 情况 A：当前已存在、可复用（4 个旧文件，复制改名即可，无需重新生成）

| 旧文件（已存在） | 复制为新文件名 | 对应活动 |
|-----------------|---------------|---------|
| `mingming-dengdai-pingguo.mp4` | `wait-time.mp4` | 等待时间 |
| `tingjue-xianxing-shui.mp4` | `audition-first.mp4` | 听觉优先 |
| `tingjue-hongzha-gou.mp4` | `auditory-bombardment.mp4` | 听觉轰炸 |
| `pingxing-shuohua-wanan.mp4` | `bedtime-routine.mp4` | 睡前常规 |

复制命令（在项目目录下执行）：
```bash
cd "C:\Users\徐子涵\AppData\Roaming\reasonix\global-workspace\avt-parent-daily\public\animations"
copy mingming-dengdai-pingguo.mp4 wait-time.mp4
copy tingjue-xianxing-shui.mp4 audition-first.mp4
copy tingjue-hongzha-gou.mp4 auditory-bombardment.mp4
copy pingxing-shuohua-wanan.mp4 bedtime-routine.mp4
```

### 情况 B：需要新生成（21 个缺失文件）

| # | 文件名 | 活动名 |
|---|--------|--------|
| 11 | `sabotage.mp4` | 破坏期待 |
| 12 | `repair-communication.mp4` | 修复沟通 |
| 13 | `morning-routine.mp4` | 晨起常规 |
| 14 | `mealtime.mp4` | 用餐时间 |
| 15 | `bath-time.mp4` | 洗澡时间 |
| 17 | `cleanup-time.mp4` | 收拾玩具 |
| 18 | `going-out.mp4` | 出门活动 |
| 19 | `peekaboo.mp4` | 躲猫猫 |
| 20 | `pretend-play.mp4` | 过家家 |
| 21 | `treasure-hunt.mp4` | 寻宝游戏 |
| 22 | `singing-movement.mp4` | 唱歌律动 |
| 23 | `shared-reading.mp4` | 绘本共读 |
| 24 | `blowing-activities.mp4` | 吹泡泡 |
| 25 | `ling6-check.mp4` | Ling-6检查 |
| 26 | `device-wearing.mp4` | 设备佩戴 |
| 27 | `device-troubleshooting.mp4` | 设备排查 |
| 28 | `face-to-face.mp4` | 面对面交流 |
| 29 | `reduce-noise.mp4` | 减少背景噪音 |
| 30 | `self-talk.mp4` | 自我谈话 |
| 31 | `parallel-talk.mp4` | 平行谈话 |
| 32 | `praise-effort.mp4` | 正向激励 |

> 每个文件建议同时生成封面 `{activityId}.png`（可选，无封面也能播放）。

---

## 三、已就位、无需处理的文件（11 个）

以下文件已在目标目录，**不要覆盖、不要改名**：

```
acoustic-highlighting.mp4
auditory-sandwich.mp4
expansion.mp4
sound-comprehension.mp4
sound-detection.mp4
sound-discrimination.mp4
sound-identification.mp4
tingjue-xianxing-shui.mp4
tingjue-hongzha-gou.mp4
mingming-dengdai-pingguo.mp4
pingxing-shuohua-wanan.mp4
```

---

## 四、视频规格（与制作指南一致）

| 项目 | 规格 |
|------|------|
| 格式 | MP4 (H.264) |
| 分辨率 | 1080×810（4:3） |
| 时长 | 15-20 秒，循环播放 |
| 声音 | **自带配音**：前 8 条（编号01-08）= 年轻妈妈声音；其余 = 原配音/原声 |
| 单个大小 | ≤ 5MB |
| 风格 | 2D 卡通儿童插画，温暖明亮 |

---

## 五、完成后自检

目标目录 mp4 总数应为 **36 个**（11 已有 + 4 复制 + 21 新生成）。

验证：
```bash
dir "C:\Users\徐子涵\AppData\Roaming\reasonix\global-workspace\avt-parent-daily\public\animations\*.mp4" | find /c ".mp4"
```
应输出 **36**。

完成后请回复：
1. 你实际放入的文件名列表
2. 目标目录 mp4 总数
