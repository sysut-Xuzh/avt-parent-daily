# sherpa-onnx + GOP 发音评估可行性调研报告

> 适用对象：面向听障 / 语言发育迟缓儿童的 AVT 居家康复训练网站
> 文档性质：纯调研 / 可行性报告（不含实现代码）
> 撰写日期：2026-09-08
> 目标：用 sherpa-onnx（离线、本地、无 key，符合"音频不出本地"红线）+ GOP（Goodness of Pronunciation）路线，替代现有仅能判断"发声且稳定"的本地基频/响度分析，实现"发音对不对"的判定。

---

## 0. 背景与问题定义

现状评分只能判断"发声了且稳定"，无法判断"发音对不对"。典型错误如 /g/→/d/ 在基频曲线上表现正常，现有 ⭐ 评分有虚假客观性。

分期目标：

- 一期：KWS 关键词检测（说没说出目标词）。
- 二期：音素级对齐 + 混淆分析，输出"音素达成度"（附治疗师人工确认）。
- 三期：用自家儿童语音微调。

本报告针对"是否走得通"做事实核查，所有结论基于下方检索到的官方文档与论文，不臆测。

---

## 1. sherpa-onnx 中文模型帧级 CTC 后验

### 1.1 三类中文模型架构对比

sherpa-onnx 的中文 ASR 模型按架构分三类，是否"能输出帧级 CTC 后验"差异巨大：

| 架构 | 代表模型 | 是否 CTC | 是否输出帧级 CTC 后验 | 备注 |
|---|---|---|---|---|
| Paraformer（离线/流式） | `sherpa-onnx-paraformer-zh-*`、`streaming-paraformer-bilingual-zh-en` | 否（encoder-decoder + predictor/sampler） | 否 | token 为汉字，无帧级 CTC 概率 |
| Zipformer / Zipformer-transducer | `streaming-zipformer-zh-*`、`zipformer-bilingual` | 否（transducer: encoder/decoder/joiner） | 否 | |
| **CTC 类** | `sherpa-onnx-streaming-zipformer-ctc-zh-*`（含 int8，2025-06-30 / 2025-07-03）、`sherpa-onnx-telespeech-ctc-int8-zh-2024-06-04` | **是（纯 CTC）** | **是** | 重点候选 |
| NeMo CTC conformer | `sherpa-onnx-nemo-ctc-*`（多为英文/俄文） | 是 | 是 | 中文少 |
| Whisper / SenseVoice | `whisper-*`、`sense-voice-*` | 否（encoder-decoder） | 否 | |

来源：sherpa-onnx 官方模型列表 `https://k2-fsa.github.io/sherpa/onnx/pretrained_models/index.html`（2026）、`https://k2-fsa.github.io/sherpa/onnx/pretrained_models/offline-ctc/index.html`（2026）；ithome 实测文章 `https://ithome.me/post/2026/08/06/on-device-asr-sherpa-onnx`（2026-08-06）。

**结论 1.1**：能输出帧级 CTC 后验的只有 **CTC 架构**模型。`sherpa-onnx-streaming-zipformer-ctc-zh-int8-2025-07-03` 是官方中文 CTC 模型，AISHELL 测试集字错误率约 1.74%（ithome 2026-08-06）。Paraformer / Whisper / Zipformer-transducer 都不行。

### 1.2 输出格式：如何取每帧每 token 的 logits / probability

高层 API（`OfflineRecognizer` / `OnlineRecognizer`）的 `result` 只返回 `text` / `tokens` / `timestamps`，**不返回帧级后验**。要取帧级概率，需调用底层 CTC 模型的 `Forward`：

- 离线 CTC：`OfflineCtcModel::Forward(features, features_length)` 返回 `log_probs`，形状 `(N, T', vocab_size)`（见 `offline-telespeech-ctc-model.h`，k2-fsa/sherpa-onnx，src 注释 "Return ... log_probs: A 3-D tensor of shape (N, T', vocab_size)"）。
- 在线 CTC：`OnlineZipformerCtcModel` / `OnlineNeMoCtcModel::Forward` 返回 `(logit, length, states)`，其中 `logit` 形状 `(B, T, C)`（见 `online-nemo-ctc-model.cc`，out[0] 注释 "logit"）。
- 取概率：`softmax(log_probs)` 对 vocab 维归一化即得每帧每 token 的后验 `P(token | frame)`；`T'` 为下采样后帧数（Zipformer CTC 下采样因子约为 4，即每 4 个 Fbank 帧对应 1 个 CTC 帧）。

来源：`https://gitee.com/c0der/sherpa-onnx/blob/master/sherpa-onnx/csrc/offline-telespeech-ctc-model.h`（2024）、`https://gitee.com/c0der/sherpa-onnx/blob/master/sherpa-onnx/csrc/online-nemo-ctc-model.cc`（2023）。

⚠️ **缺口 1（需实测）**：WASM / JS 绑定默认暴露的是 `OfflineRecognizer` / `OnlineRecognizer` 高层类（见 DeepWiki 4.1 `https://deepwiki.com/k2-fsa/sherpa-onnx/4.1-build-configuration`，2026），文档未说明是否导出 raw CTC logits。浏览器侧要拿到帧级后验，可能需要在 wasm 构建里新增 C-API 导出。这是原型期第一个待验证点。

### 1.3 关键约束：中文模型是"汉字级"而非"音素级"

sherpa-onnx 官方中文模型的 token 是**汉字**（如 paraformer / zipformer 的 `tokens.txt` 为汉字表），CTC 后验分布的是"汉字"而非"音素（声母/韵母/拼音）"。要检测 /g/→/d/ 这类**音素级**混淆，需要音素（拼音 initial/final）为 token 的 CTC 模型——官方预训练集里**没有中文音素 CTC 模型**（现有 CTC 中文模型都是汉字级）。这一点直接决定二期是否可行，见第 2、3 节。

---

## 2. GOP 算法标准流程与对 CTC 的适配

### 2.1 经典 GOP（Witt & Young 2000）

对音素序列 `L_cano` 与目标语音特征 `O_1^T`，对每个目标音素 `l_i`，先做**强制对齐**得到其对应的帧段 `[t1, t2]`，再计算：

```
GOP_classical(l_i) = log( p(O_{t1..t2} | l_i) · P(l_i) / Σ_q p(O_{t1..t2} | q) · P(q) ) / (t2 - t1)
```

依赖 HMM-GMM 声学模型 + 强制对齐；`t2 - t1` 为段长归一化。

来源：Witt, S. M. B., & Young, S. J. (2000). *Phone-level pronunciation scoring and assessment for interactive language learning*. Speech Communication, 30(2-3), 95-108.

### 2.2 DNN / 后验版 GOP（Hu et al. 2015 等）

深度模型普及后，GOP 直接用语音模型的**帧级后验**，不再显式算似然：

```
GOP_DNN(l_i) = (1 / (t2 - t1)) · Σ_{t=t1..t2} log P(l_i | o_t)
```

即对音素 `l_i` 对齐段内所有帧的后验取对数平均。这一步正是把 sherpa-onnx 的 CTC 逐帧后验用起来的位置。

来源：Hu et al. 2015 等（Witt & Young 的 DNN 推广，被 Cao 2024、Parikh 2025 等多篇引用）。

### 2.3 对齐到 sherpa-onnx CTC 输出的适配要点

用 sherpa-onnx 跑 GOP，需要两样东西：

1. **帧级音素后验** `P(l_i | o_t)`：来自第 1 节 CTC 模型的 `softmax(log_probs)`，且要求模型是**音素级**（见 1.3 缺口）。
2. **目标音素序列到帧的强制对齐** `[t1, t2]`。两种取得方式：
   - **基于 CTC 的强制对齐**：用 Viterbi 在 CTC trellis（emission 矩阵）上找目标序列最优路径，类似 `torchaudio.functional.forced_align`（PyTorch 参考实现，`https://docs.pytorch.org/audio/stable/tutorials/forced_alignment_tutorial.html`）；或用语音工具 `ctc-segmentation` 做 token/字级对齐后映射到音素（见第 3 节）。
   - **alignment-free CTC-GOP（Cao et al. 2024）**：不强制对齐，改为计算 `log P(L_canonical | O) / P(L_perturbed | O)`，对每个目标音素做"替代/删除"扰动得到扰动序列的概率。其论文实验用 **CMU-kids（儿童语音）+ Speechocean762（含儿童与成人）**，最佳方法相对基线 GOP 提升 **29.02%**。这恰是针对"儿童语音 + 无需精确对齐"的思路。
   - 来源：Cao, X., Fan, Z., Svendsen, T., & Salvi, G. (2024). *A Framework for Phoneme-Level Pronunciation Assessment Using CTC*. Interspeech 2024, pp. 302-306. DOI: 10.21437/Interspeech.2024-459（`http://ntnuopen.ntnu.no/ntnu-xmlui/handle/11250/3155686`）。

### 2.4 CTC 的"peaky"问题与针对儿童语音的缓解

CTC 训练会过度输出 blank，导致后验**稀疏、尖峰化**，直接 softmax 做 GOP 不稳定（Li et al. 2026 称为 peaky behavior）。两条缓解路线被近期论文验证对**儿童语音**尤其重要：

- **Context-aware CTC**（OCD + label prior + max conditional entropy 正则）：缓解 peakiness，稳定 logits，GOPT 音素 PCC 由 0.612 提升至 0.641（speechocean762）。来源：Li, J.-T., et al. (2026). *Investigating Context-aware CTC for Pronunciation Assessment*. BEA 2026（`https://aclanthology.org/anthology-files/pdf/bea/2026.bea-1.3.pdf`）。
- **Logit-based GOP（直接用 raw logits 而非 softmax）**：softmax 在儿童/非母语语音上过度自信，掩盖细微错误；改用 `GOP_MaxLogit` / `GOP_Margin` / `GOP_LogitVariance` 等 raw-logit 指标更稳健，且特别点名"children's speech and non-native speakers, where articulatory deviations are very common"。来源：Parikh et al. (2025). *Evaluating Logit-Based GOP Scores for Mispronunciation Detection*. Interspeech 2025（`https://www.isca-archive.org/interspeech_2025/parikh25b_interspeech.pdf`）；以及 Parikh et al. (2025). *Enhancing GOP in CTC-Based Mispronunciation Detection with Phonological Knowledge*（`https://arxiv.org/abs/2506.02080`）。

### 2.5 中文适配小结

- 目标序列须是**音素序列**（声母/韵母或拼音），而非汉字。
- CTC 模型须是**音素级**；否则只能做"汉字级 GOP"，对同音/近音音素混淆（如 /g/↔/d/ 落在不同汉字时）可能漏判。
- 推荐二期采用 **alignment-free CTC-GOP + logit 版指标**，减少对齐误差，且对儿童语音更稳。

---

## 3. 开源实现调研

检索关键词：`sherpa-onnx pronunciation assessment`、`forced alignment`、`CTC segmentation`、`k2-fsa GOP`。结果如下。

| 项目 | 地址 | 是否 sherpa-onnx / ONNX | 成熟度 | 与本路线关系 |
|---|---|---|---|---|
| **k2-fsa/sherpa-onnx** | `https://github.com/k2-fsa/sherpa-onnx` | 是 | 生产级（v1.13.x） | 提供 ASR/TTS/VAD/KWS，但**无内置 GOP / 发音评估模块**；仅作为后验来源 |
| **frank613/CTC-based-GOP** | `https://github.com/frank613/CTC-based-GOP` | 否（PyTorch wav2vec2 微调为音素识别器） | 研究代码（含 is24 / taslpro26 文件夹、GOP-SF-CTC-Norm 与伪代码） | Cao 2024 官方实现，**算法参考最佳**，但后端非 ONNX/WASM，不能直接落地浏览器 |
| **lumaku/ctc-segmentation** | `https://github.com/lumaku/ctc-segmentation`（Kürzinger 2020，arXiv 2007.09127） | 后端无关（输入 lpz 即可） | 生产级（pip 安装，集成于 SpeechBrain/NeMo/ESPnet） | 通用 CTC 强制对齐工具，可把 sherpa-onnx 取出的 CTC 后验 `lpz` 做 token/字级时间戳对齐，再映射音素 |
| **torchaudio.functional.forced_align / Wav2Vec2FABundle** | `https://docs.pytorch.org/audio/stable/tutorials/forced_alignment_tutorial.html` | 否（PyTorch） | 参考实现 | 仅作 Viterbi 对齐算法参考，不进 WASM |
| **k2-fsa/icefall** | `https://github.com/k2-fsa/icefall` | 训练/导出到 ONNX | 训练框架 | 可用于**自建中文音素 CTC 模型并导出 ONNX**（填补 1.3 缺口），无现成 GOP |

**结论 3**：

- 未发现成熟的"sherpa-onnx + GOP"一体化开源实现。
- 积木齐全且可靠：① CTC 帧级后验（sherpa-onnx CTC 模型）；② 强制对齐（ctc-segmentation）；③ 对齐无关 GOP 算法（Cao 2024 + Parikh 2025 的 logit 指标）。
- 真正缺的是**中文音素级 CTC 模型**（sherpa-onnx 官方无，需 icefall 自建或等三期儿童微调）。这是组装路线的核心工作量与风险点。

---

## 4. WASM 浏览器本地运行预估

### 4.1 包体大小

- WASM 运行时：`sherpa-onnx-wasm-asr-main.wasm` ≈ **10 MB**（SIMD 版），glue `.js` ≈ 90 KB。来源：`https://k2-fsa.github.io/sherpa/onnx/wasm/build.html`（2026，官方构建示例：bilingual zh-en 流式 zipformer 的 `.data` 199 MB、`.wasm` 10 MB）。
- 模型：以 `.data` 内嵌或单独 fetch 加载。中文 int8 CTC 模型（`zipformer-ctc-zh-int8-2025-07-03`）量级约 **60–90 MB**（ithome 2026-08-06 提及压缩包 287 MB 内含 fp32+int8+测试音频，int8 模型本体为几十 MB 级）。符合用户"中文模型几十 MB 量级"的预期。
- 合计首屏：运行时 10 MB + 模型几十 MB，浏览器侧用 `Cache Storage` 缓存后二次访问仅加载模型增量。

### 4.2 内存占用

- WASM 构建初始预留 **512 MB**（`-sINITIAL_MEMORY=512MB` + `ALLOW_MEMORY_GROWTH=1`，DeepWiki 4.1 `https://deepwiki.com/k2-fsa/sherpa-onnx/4.1-build-configuration`，2026）。
- 实测运行占用（多源汇总表）：浏览器侧 **100–300 MB**；Android arm64 约 80–150 MB，低端机更高。来源：CSDN 部署实测汇总（`https://blog.csdn.net/gitblog_00921/article/details/160980071`、`https://blog.csdn.net/gitblog_00442/article/details/141075644`，2024-2026）。

### 4.3 低端安卓加载延迟注意事项

- **下载 + 实例化**：int8 模型 60–90 MB 需网络下载 + WASM 编译（实例化耗 CPU），低端机首屏延迟可达数秒~十几秒；务必放 **Web Worker**（避免阻塞 UI），并用流式/分块加载 + 本地缓存。
- **线程**：浏览器 ASR WASM 默认**单线程**（pthread 需 `-pthread` 且依赖跨域隔离头 `COOP/COEP`，兼容性参差）；单线程 CPU 推理在低端安卓更慢，建议限制 `num_threads` 并预热身。
- **音频隐私**：麦克风经 Web Audio → WASM 推理，全程不出本地，符合红线。
- **内存**：< 3 GB RAM 机型有 OOM 风险，需做降级或明确提示。
- **int8 精度**：量化降本但 GOP 对数值敏感，int8 后验是否影响阈值判定需在原型期验证。

---

## 5. 4 周原型验证计划

### 5.1 目标

用**成人**验证集证明"帧级 / 音素后验"能否区分正确发音 vs 典型错误（如 /g/→/d/）。先不碰儿童数据，规避伦理与采集难度。

### 5.2 验证集构造

- 选 **10–20 个目标词**，覆盖易混淆音素对：g/d、zh/z、ch/c、sh/s、n/l、f/h、平翘舌、前后鼻音 an/ang 等。
- 每词采集：
  - **正确发音** ≥ 20 条（成人，安静环境，16 kHz 单声道 wav）。
  - **故意错误发音** ≥ 20 条：由成人刻意发错（尤其制造 /g/→/d/ 等），或用可控方式合成近似错误。
- 额外构造"儿童错误代理"：成人夸张/含糊发音，模拟发育迟缓典型错误，用于观察分布。
- 录音规约：16 kHz、单声道、wav；标注"目标词 + 是否正确 + 错误类型"。

### 5.3 周计划

- **W1 环境与点位验证**：下载 `zipformer-ctc-zh-int8-2025-07-03`，确认能否取出帧级 logits（验证缺口 1）；同时接 `ctc-segmentation` 跑汉字级对齐，确认链路通。
- **W2 层级判定**：若音素级模型不可得，先用**汉字级**检测——错误发音若改变汉字（如 哥/得），KWS/字符级可判；若同音/近音混淆（不改变汉字），记录"无法判定"的数量，重点看 /g/→/d/ 在字符级是否可分。
- **W3 GOP 计分**：对可区分样本计算 `GOP_DNN` 与 logit 版指标（取 `GOP_MaxLogit` / `GOP_Margin`），按词设定阈值，统计正确 vs 错误的 **AUC / 分离度**。
- **W4 汇总与止损判定**：见 5.4。

### 5.4 判定标准（明确止损线）

- 若成人集上 GOP/后验对"正确 vs 错误"的 **AUC < 0.6**（或正确/错误分布无显著分离）→ 说明该路线在成人层面已不成立，**儿童更不可能区分**。
- 立即止损：整理验证集与结果数据，**带数据咨询言语治疗师**，不内部硬扛；与老师讨论是否需要 (a) 自建音素级模型，或 (b) 直接进入三期儿童微调数据。
- 全程不替代治疗师：二期即设"人工确认"环节，三期才用儿童数据微调提升域泛化。

---

## 6. 可行性初步结论

基于上述检索事实（非臆测），结论如下：

1. **帧级 CTC 后验可得，但有架构限制**：只有 CTC 架构模型（`zipformer-ctc-zh` / `telespeech-ctc-zh`）能输出帧级后验；Paraformer / Whisper / Zipformer-transducer 不行。取后验需绕过高层 API 调底层 `Forward`，且 **WASM/JS 是否暴露 raw logits 待实测**（缺口 1）。

2. **中文"汉字级" vs GOP"音素级"是二期最大风险**：sherpa-onnx 官方中文模型是汉字级，无法天然检测 /g/→/d/ 这类音素混淆。需**自建中文音素 CTC 模型**（icefall 导出 ONNX）或依赖三期儿童微调。一期 KWS（汉字级即可）风险最低、最稳。

3. **算法有成熟研究基础，非从零开始**：Cao 2024 的 alignment-free CTC-GOP（含儿童语音 CMU-kids 实验，+29.02%）与 Parikh 2025 的 logit-based GOP（明确针对 children's speech 的 softmax 过度自信）已给出可用方案；"sherpa-onnx + GOP"无现成一体化实现，但积木齐全（CTC logits + ctc-segmentation 对齐 + 自写 GOP 计分），需自行组装。

4. **WASM 本地运行体量可行**：运行时 ~10 MB + 模型几十 MB，初始内存预留 512 MB、实际 100–300 MB；低端安卓需注意下载/实例化延迟、单线程推理慢、内存 OOM，建议 Web Worker + 缓存 + int8。

5. **总体方向可行，但需先过成人验证止损线**：建议按第 5 节 4 周计划，以"成人都分不清 → 儿童更不行 → 带数据咨询老师"为硬止损，不在内部硬扛。一期先行、二期依赖音素级模型到位、三期儿童微调是提升儿童域泛化的关键。

---

## 参考来源（含检索日期 2026-09-08）

- sherpa-onnx 官方文档与模型列表：`https://k2-fsa.github.io/sherpa/onnx/index.html`、`https://k2-fsa.github.io/sherpa/onnx/pretrained_models/offline-ctc/index.html`、`https://k2-fsa.github.io/sherpa/onnx/pretrained_models/index.html`
- WASM 构建：`https://k2-fsa.github.io/sherpa/onnx/wasm/build.html`；DeepWiki WASM 配置：`https://deepwiki.com/k2-fsa/sherpa-onnx/4.1-build-configuration`
- CTC 模型 Forward 接口：`offline-telespeech-ctc-model.h`、`online-nemo-ctc-model.cc`（k2-fsa/sherpa-onnx，csrc）
- 中文 CTC 模型实测（zipformer-ctc-zh-int8-2025-07-03，AISHELL WER 1.74%）：`https://ithome.me/post/2026/08/06/on-device-asr-sherpa-onnx`（2026-08-06）
- GOP 经典定义：Witt & Young (2000), Speech Communication 30(2-3):95-108
- alignment-free CTC-GOP：Cao et al. (2024), Interspeech 2024, DOI 10.21437/Interspeech.2024-459；代码 `https://github.com/frank613/CTC-based-GOP`
- Logit-based GOP（儿童语音）：Parikh et al. (2025), Interspeech 2025，`https://www.isca-archive.org/interspeech_2025/parikh25b_interspeech.pdf`；Parikh et al. (2025) arXiv:2506.02080
- Context-aware CTC：Li et al. (2026), BEA 2026，`https://aclanthology.org/anthology-files/pdf/bea/2026.bea-1.3.pdf`
- CTC 强制对齐：`https://github.com/lumaku/ctc-segmentation`（Kürzinger 2020, arXiv:2007.09127）；`https://docs.pytorch.org/audio/stable/tutorials/forced_alignment_tutorial.html`（参考）
- 部署体量参考：CSDN 多源汇总 `https://blog.csdn.net/gitblog_00921/article/details/160980071`、`https://blog.csdn.net/gitblog_00442/article/details/141075644`
