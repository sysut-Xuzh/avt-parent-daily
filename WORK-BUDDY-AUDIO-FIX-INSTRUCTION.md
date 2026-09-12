# 🎙️ 给 work Buddy：前 10 条动画补配音指令

## 问题

经检查，`public/animations/` 目录下 **15 个 mp4 文件没有音轨**（纯画面无声）：

```
acoustic-highlighting.mp4   ← 声学强调
audition-first.mp4          ← 听觉优先
auditory-bombardment.mp4    ← 听觉轰炸
auditory-sandwich.mp4       ← 听觉三明治
bedtime-routine.mp4         ← 睡前常规
expansion.mp4               ← 扩展表达
mingming-dengdai-pingguo.mp4← (旧文件,可忽略)
pingxing-shuohua-wanan.mp4  ← (旧文件,可忽略)
sound-comprehension.mp4     ← 声音理解
sound-detection.mp4         ← 声音觉察
sound-discrimination.mp4    ← 声音分辨
sound-identification.mp4    ← 声音识别
tingjue-hongzha-gou.mp4     ← (旧文件,可忽略)
tingjue-xianxing-shui.mp4   ← (旧文件,可忽略)
wait-time.mp4               ← 等待时间
```

其中 **编号 01-10 对应的 11 个文件**需要你补配音（4 个旧拼音文件不用管，是备份）：

| # | 文件名 | 活动名 | 需要配的台词 |
|---|--------|--------|-------------|
| 01 | sound-detection.mp4 | 声音觉察 | 叮铃铃，听！ |
| 02 | sound-discrimination.mp4 | 声音分辨 | 哞——嗡——，一样吗？ |
| 03 | sound-identification.mp4 | 声音识别 | 给我勺子 |
| 04 | sound-comprehension.mp4 | 声音理解 | 先拿红球，再放进篮子 |
| 05 | audition-first.mp4 | 听觉优先 | 先听水声，哗啦啦，再出示水 |
| 06 | auditory-sandwich.mp4 | 听觉三明治 | 球，听——看——再听 |
| 07 | acoustic-highlighting.mp4 | 声学强调 | 红——色——的球 |
| 08 | wait-time.mp4 | 等待时间 | 拿起苹果，说「苹果」，等一等 |
| 09 | auditory-bombardment.mp4 | 听觉轰炸 | 汪汪，汪汪，汪汪 |
| 10 | expansion.mp4 | 扩展表达 | 红色的球 |

## 配音要求（重要！）

1. **音色**：温柔年轻的妈妈声音，语速稍慢（适合幼儿），语气亲切自然
2. **⚠️ 必须是自然真人声音**，不要用机械 TTS 合成音。如果只能用 TTS，请使用最高质量的自然音色（如 Azure Neural TTS 的中文女声 huihui/yaoyao，或 ElevenLabs 中文音色），**避免早期机器人音色**
3. **台词**：按上表，在动画对应镜头出现时说出
4. **方式**：直接把音轨合成进 mp4（保持 H.264 + AAC，格式不变），替换原文件
5. **完成后验证**：每个文件应包含音轨（可用 ffprobe 检查：`ffprobe -v error -show_streams -select_streams a xxx.mp4` 应有 audio stream）

## 完成后自检

```bash
# 逐个检查这 11 个文件是否有音轨
for f in sound-detection sound-discrimination sound-identification sound-comprehension audition-first auditory-sandwich acoustic-highlighting wait-time auditory-bombardment expansion; do
  has=$(ffprobe -v error -show_streams -select_streams a "C:\Users\徐子涵\AppData\Roaming\reasonix\global-workspace\avt-parent-daily\public\animations\$f.mp4" 2>&1)
  echo "$f.mp4: $([ -n "$has" ] && echo 有音轨 || echo 无音轨)"
done
```

完成后请回复：11 个文件是否全部含音轨。
