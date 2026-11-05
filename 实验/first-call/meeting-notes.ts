import "dotenv/config";
import { z } from "zod";
import * as readline from "node:readline/promises";

const BASE_URL = (process.env.LLM_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "");
const API_KEY = process.env.LLM_API_KEY ?? "";
const MODEL = process.env.LLM_MODEL ?? "deepseek-chat"; // ?? 后只是 .env 没配时的兜底；实际以 .env 为准（当前 deepseek-flash）

// —— 给程序看的：Zod schema（运行时校验 + 类型推断）——
const MeetingSchema = z.object({
  title: z.string().describe("会议主题"),
  decisions: z.array(z.string()).describe("会上做出的决定，每条一句"),
  actionItems: z.array(z.object({
    owner: z.string().describe("负责人"),
    task: z.string(),
    due: z.string().nullable().describe("截止时间，没有就 null"),
  })),
});
type Meeting = z.infer<typeof MeetingSchema>;

// —— 给模型看的：同一结构的 JSON Schema（手写，字段保持一致）——
const meetingJsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    decisions: { type: "array", items: { type: "string" } },
    actionItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          owner: { type: "string" },
          task: { type: "string" },
          due: { type: ["string", "null"] },
        },
        required: ["owner", "task", "due"],
      },
    },
  },
  required: ["title", "decisions", "actionItems"],
};

const SYSTEM = `你是会议记录整理器。把用户的随手笔记转成 JSON，结构必须符合：
${JSON.stringify(meetingJsonSchema)}
只输出 JSON 本身：不要代码围栏，不要解释。`;

async function chat(messages: any[], temperature = 0) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({ model: MODEL, messages, temperature }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
  return json.choices[0].message.content as string;
}

async function tidy(rawNotes: string): Promise<Meeting> {
  const messages = [
    { role: "system", content: SYSTEM },
    { role: "user", content: rawNotes },
  ];
  for (let attempt = 1; attempt <= 2; attempt++) {
    const out = await chat(messages);
    const cleaned = out.trim().replace(/^```(json)?\s*|```\s*$/g, ""); // 防围栏
    let obj: unknown;
    try { obj = JSON.parse(cleaned); }
    catch { obj = { "__parse_error__": cleaned.slice(0, 200) }; }

    const parsed = MeetingSchema.safeParse(obj);
    if (parsed.success) return parsed.data;

    // ③ self-heal：把失败原因喂回去，让模型自己修
    console.log(`[尝试 ${attempt}] 校验没过，带错误重试：${parsed.error.message.slice(0, 120)}...`);
    messages.push(
      { role: "assistant", content: out },
      { role: "user", content: `输出没通过校验：${parsed.error.message.slice(0, 300)}。修正后重新只输出 JSON。` },
    );
  }
  throw new Error("两次都没通过校验，放弃");
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const notes = await rl.question("粘贴会议笔记：\n");
console.log("\n整理结果：");
console.log(JSON.stringify(await tidy(notes), null, 2));
rl.close();
