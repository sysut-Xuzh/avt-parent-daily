// LLM 调用封装
// 支持 OpenAI 和 DeepSeek
// 环境变量: LLM_API_KEY, LLM_BASE_URL (可选, 默认 OpenAI)

interface LLMConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

function getConfig(): LLMConfig {
  const apiKey = process.env.LLM_API_KEY || "";
  // 如果 LLM_BASE_URL 未设置，默认用 DeepSeek（更便宜）
  const baseURL =
    process.env.LLM_BASE_URL || "https://api.deepseek.com/v1";
  const model = process.env.LLM_MODEL || "deepseek-chat";
  return { apiKey, baseURL, model };
}

interface GenerateTasksParams {
  weekTargetWords: string[];
  weekStrategies: string[];
  babyAge?: string;
  babyName?: string;
}

interface GeneratedTask {
  time: string;
  scene: string;
  sceneIcon: string;
  strategy: string;
  targetWord: string;
  instruction: string;
}

/**
 * 调用 LLM 生成每日任务
 */
export async function generateDailyTasks(
  params: GenerateTasksParams
): Promise<GeneratedTask[]> {
  const config = getConfig();

  const prompt = `你是一位AVT（听觉口语法）康复训练助手。请根据以下信息，生成今天4-6个训练任务。

本周目标词：${params.weekTargetWords.join("、")}
可用策略：${params.weekStrategies.join("、")}
宝宝年龄：${params.babyAge || "未知"}
宝宝名字：${params.babyName || "宝宝"}

要求：
1. 每个任务包含一个目标词和一个策略
2. 话术指令要具体、可操作，家长一看就会做
3. 任务分布在不同日常场景（早餐/游戏/洗澡/睡前等）
4. 使用对应的场景 emoji 图标
5. 返回 JSON 数组

格式示例：
[
  {
    "time": "07:30",
    "scene": "早餐",
    "sceneIcon": "🍳",
    "strategy": "命名等待",
    "targetWord": "苹果",
    "instruction": "拿起苹果 → 说"苹果" → 靠近耳边 → 等5秒"
  }
]`;

  const res = await fetch(`${config.baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content:
            "你是AVT康复训练助手，生成JSON格式的每日训练任务。只返回合法的JSON数组，不要包含其他文字。",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`LLM API 错误 (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "[]";

  // 解析返回的 JSON
  const parsed = JSON.parse(content);
  // 兼容返回格式可能是 { tasks: [...] } 或 [...]
  const tasks = Array.isArray(parsed) ? parsed : parsed.tasks || [];

  return tasks;
}
