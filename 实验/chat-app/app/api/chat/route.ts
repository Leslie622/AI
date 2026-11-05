import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool, stepCountIs, convertToModelMessages, type UIMessage } from "ai";
import { z } from "zod";
import { readFileSync } from "node:fs";
import path from "node:path";
// .env 不用 dotenv：Next.js 原生加载工程根目录的 .env（内置能力之一）

// —— 模型：OpenAI 兼容协议指向 DeepSeek（6.1：换厂商只改这里三行）——
// Key 只在服务端读（5.3 纪律：永不进浏览器）
const deepseek = createOpenAI({
  baseURL: process.env.LLM_BASE_URL
    ? process.env.LLM_BASE_URL.replace(/\/+$/, "") + "/v1"
    : "https://api.deepseek.com/v1",
  apiKey: process.env.LLM_API_KEY ?? "",
});
const MODEL_ID = process.env.LLM_MODEL ?? "deepseek-chat";

// —— 工具：从 5.4 实验台原样搬来（白名单校验在【我们的代码】里）——
// 注意：ai v7 把工具 schema 字段从 parameters 改名为 inputSchema（旧文档/旧教程对不上就查这里）
const read_file = tool({
  description: "读取 data/ 目录下的文本文件，返回内容。只允许 data/ 内的文件。",
  inputSchema: z.object({
    filename: z.string().describe("文件名，如 todo.md"),
  }),
  execute: async ({ filename }: { filename: string }) => {
    const safe = path.basename(filename); // 剥掉 ../ 花招（5.4 同款防线）
    try {
      return readFileSync(path.join(process.cwd(), "data", safe), "utf8");
    } catch (e) {
      return `读取失败：${e instanceof Error ? e.message : String(e)}`; // 失败也回喂（5.4 教训）
    }
  },
});

// —— POST /api/chat：聊天应用的心脏 ——
export async function POST(req: Request) {
  // 前端 useChat 发来的是 UIMessage[]（带 UI 元数据的消息）
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: deepseek(MODEL_ID),
    system:
      "你是桌面助手，回答用中文。需要读文件时调用 read_file 工具。",
    messages: await convertToModelMessages(messages), // UIMessage[] → 协议的 messages（5.1 剧本）
    tools: { read_file },
    stopWhen: stepCountIs(5), // 5.4 的 MAX_ROUNDS 保险丝：SDK 内部跑整个 Agent 循环
  });

  // SSE 流（2.3/6.2 的信封）由 SDK 打包 —— 替你干了 first-call 手搓的全部活
  return result.toUIMessageStreamResponse();
}
