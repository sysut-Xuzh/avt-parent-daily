/**
 * 云端 ASR 目标词匹配（建议二 L4 / Phase 3）
 * ----------------------------------------------------------------
 * 真实场景：接入讯飞/百度通用 ASR，仅对「完美参与」录音调用，降低 ~60% 调用量。
 * 当前原型：未配置 ASR 密钥时，走本地启发式（基于声线分析给出的儿童有效发声
 *           与录音时长做合理性估计），并在结果中标注 mode，便于后续替换真实 API。
 *
 * 接入真实 ASR：在 .env.local 配置 NEXT_PUBLIC_ASR_PROVIDER=iflytek 与对应密钥，
 * 并在 recognizeTargetWord 的 cloud 分支实现 HTTP 调用即可。
 */

export interface AsrResult {
  matched: boolean;
  confidence: number; // 0-1
  word: string;
  mode: "cloud" | "local";
  note?: string;
}

function hasAsrKey(): boolean {
  if (typeof window === "undefined") return false;
  return !!process.env.NEXT_PUBLIC_ASR_PROVIDER;
}

/**
 * 本地启发式：无法真正识别语音，仅依据声线分析结果做合理性估计。
 * 规则（演示用，非真实识别）：
 *  - 必须检测到儿童有效发声，否则不可能说出目标词
 *  - 有效发声时长越长、参与度越高，匹配置信度越高
 */
function localHeuristic(
  word: string,
  childVoiceRatio: number,
  effectiveDuration: number,
  engagementStars: number
): AsrResult {
  if (childVoiceRatio <= 0 || effectiveDuration < 0.3) {
    return {
      matched: false,
      confidence: 0,
      word,
      mode: "local",
      note: "未检测到儿童有效发声，本地启发式判定未说出目标词",
    };
  }
  const conf = Math.min(
    0.95,
    0.4 + childVoiceRatio * 0.3 + Math.min(effectiveDuration, 3) * 0.12 + engagementStars * 0.05
  );
  return {
    matched: true,
    confidence: Number(conf.toFixed(2)),
    word,
    mode: "local",
    note: "本地启发式（未接真实 ASR）：检测到儿童有效发声，估计说出目标词",
  };
}

export async function recognizeTargetWord(
  _blob: Blob,
  word: string,
  hints: { childVoiceRatio: number; effectiveDuration: number; engagementStars: number }
): Promise<AsrResult> {
  if (hasAsrKey()) {
    // TODO(Phase3-真实ASR): 在此调用讯飞/百度 ASR，传入 blob，解析是否含 word。
    // 伪代码：
    //   const text = await callCloudAsr(_blob);
    //   return { matched: text.includes(word), confidence: ..., word, mode: "cloud" };
    // 当前未实现，回退本地。
  }
  return localHeuristic(word, hints.childVoiceRatio, hints.effectiveDuration, hints.engagementStars);
}
