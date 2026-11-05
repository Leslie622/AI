// server.ts —— first-call 本地控制台
//
//   npm run ui        启动后自动打开浏览器（默认 http://localhost:8787）
//
// 左边调参数，右边实时看 SSE 逐行推送与逐步拼装的回复；
// 每次调用照旧写入 logs/run-<时间戳>.json + logs/last-run.json（Key 打码）。
// API Key 从 .env 读取；UI 里可临时覆盖（仅内存，不落盘）。
import "dotenv/config";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.UI_PORT ?? 8787);
const BASE_URL = (process.env.LLM_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "");
const API_KEY = process.env.LLM_API_KEY ?? "";
const MODEL = process.env.LLM_MODEL ?? "deepseek-chat"; // ?? 后只是 .env 没配时的兜底；实际以 .env 为准（当前 deepseek-flash）
const LOG_DIR = path.join(here, "logs");

const maskKey = (k: string) =>
  k ? (k.length > 8 ? `${k.slice(0, 4)}****${k.slice(-4)}` : "****") : "(空)";

const UI_HTML = await readFile(path.join(here, "ui.html"), "utf8");
const LAB53_HTML = await readFile(path.join(here, "lab53.html"), "utf8");
const LAB54_HTML = await readFile(path.join(here, "lab54.html"), "utf8");

// ================= 5.4 Function Calling 实验台 =================
import { readFileSync } from "node:fs";

// —— 第 1 步的"说明书"：tools（模型只靠这段话决定用不用、怎么传参）——
const TOOLS = [{
  type: "function",
  function: {
    name: "read_file",
    description: "读取 data/ 目录下的文本文件，返回文件内容。只允许读 data/ 内的文件。",
    parameters: {
      type: "object",
      properties: {
        filename: { type: "string", description: "文件名，如 todo.md" },
      },
      required: ["filename"],
    },
  },
}];

// —— 第 3 步的执行器：白名单校验在【你的代码】里，模型说了不算 ——
function execReadFile(filename: string): string {
  const safe = path.basename(filename); // 剥掉 ../ 花招
  return readFileSync(path.join(here, "data", safe), "utf8");
}

/** 5.4 核心：跑一次完整的"模型↔工具"往返循环，每一步全部记录 */
async function runAgent(task: string, maxRounds: number) {
  const t0 = Date.now();
  const rounds: any[] = [];
  const messages: any[] = [
    { role: "system", content: "你是助手。需要读文件时调用 read_file 工具。回答用中文。" },
    { role: "user", content: task },
  ];

  let finalAnswer: string | null = null;
  let stoppedByFuse = false;

  for (let round = 1; round <= maxRounds; round++) {
    const rec: any = { round, toolCalls: [], validations: [] };

    // ── 第 1+2 步：带着 tools 发请求 → 模型要么给最终回答，要么给工具意图 ──
    // structuredClone：请求体必须是【发送那一刻】的快照——不然响应回来 push 进
    // messages 的最终回答会把所有轮次的 wire.body 一起"污染"（JS 引用语义的坑）
    const body = { model: MODEL, messages: structuredClone(messages), temperature: 0, tools: TOOLS };
    const wire = {
      url: `${BASE_URL}/chat/completions`,
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${maskKey(API_KEY)}` },
      body,
    };
    const tt = Date.now();
    const res = await fetch(wire.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    });
    const rawBody = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(rawBody); } catch { /* 保留原文 */ }
    if (!res.ok) {
      rec.wire = { ...wire, status: `${res.status} ${res.statusText}`, durationMs: Date.now() - tt };
      rec.upstream = parsed ?? rawBody;
      rec.error = `HTTP ${res.status}`;
      rounds.push(rec);
      break;
    }
    const msg = parsed?.choices?.[0]?.message;
    const finish = parsed?.choices?.[0]?.finish_reason;
    rec.wire = { ...wire, status: `${res.status} ${res.statusText}`, durationMs: Date.now() - tt };
    rec.fullResponse = parsed;
    rec.finishReason = finish;

    messages.push(msg); // 意图（含 tool_calls）必须原样进历史

    // ── 分岔：模型不要工具 = 语义停 ──
    if (!msg?.tool_calls?.length) {
      finalAnswer = msg?.content ?? "";
      rec.decision = "stop"; // 模型决定不再要工具
      rec.content = finalAnswer;
      rounds.push(rec);
      break;
    }

    rec.decision = "tool_calls"; // 模型决定要用工具
    rec.content = msg.content ?? null;

    // ── 第 3 步：你的代码执行，结果回喂 ──
    for (const call of msg.tool_calls) {
      const fn = call?.function ?? {};
      let argsParsed: unknown = null;
      let argsError: string | null = null;
      try { argsParsed = JSON.parse(String(fn.arguments ?? "{}")); } catch (e) {
        argsError = e instanceof Error ? e.message : String(e);
      }
      let result: string;
      let execOk = true;
      if (argsError) { result = `参数解析失败：${argsError}`; execOk = false; }
      else {
        try { result = execReadFile((argsParsed as any)?.filename ?? ""); }
        catch (e) { result = `读取失败：${e instanceof Error ? e.message : String(e)}`; execOk = false; }
      }
      rec.toolCalls.push({
        id: call.id, name: fn.name, argumentsRaw: fn.arguments, argsParsed, argsError,
        execOk,
        resultPreview: result.slice(0, 400),
        resultBytes: result.length,
      });
      messages.push({ role: "tool", tool_call_id: call.id, content: result }); // 失败也回喂
    }
    rounds.push(rec);
    // 循环继续 → 回到第 1 步重新请求（rec 已记录本轮全部细节）
  }
  if (finalAnswer === null && rounds.length >= maxRounds) stoppedByFuse = true;

  return {
    task, maxRounds,
    ok: finalAnswer !== null,
    finalAnswer,
    stoppedByFuse,
    rounds,
    totalRounds: rounds.length,
    durationMs: Date.now() - t0,
    messagesFinal: messages, // 最终完整对话历史（研究"剧本怎么长起来的"）
    model: MODEL,
  };
}
// ================= 5.4 实验台结束 =================

// ================= 5.3 结构化输出实验台 =================
import { z } from "zod";

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
    title: { type: "string", description: "会议主题" },
    decisions: { type: "array", items: { type: "string" } },
    actionItems: {
      type: "array",
      items: {
        type: "object",
        properties: {
          owner: { type: "string", description: "负责人" },
          task: { type: "string" },
          due: { type: ["string", "null"], description: "截止时间，没有就 null" },
        },
        required: ["owner", "task", "due"],
      },
    },
  },
  required: ["title", "decisions", "actionItems"],
} as const;

function buildMeetingMessages(notes: string, level: 0 | 1 | 2 | 3) {
  // level: 0=裸恳求(无schema) 1=恳求+schema 2=+response_format硬开关 3=+Zod自愈循环
  const base = `你是会议记录整理器。把用户的随手笔记转成 JSON。`;
  const withSchema = `${base}结构必须符合：
${JSON.stringify(meetingJsonSchema)}
只输出 JSON 本身：不要代码围栏，不要解释。`;
  const system = level === 0 ? base : withSchema;
  return [
    { role: "system", content: system },
    { role: "user", content: notes },
  ];
}

/** ① 层：防围栏（模型偶发 ```json 残渣） */
function stripFence(text: string): string {
  return text.trim().replace(/^```(json)?\s*|```\s*$/g, "");
}

async function chatOnce(messages: any[], bodyExtra: Record<string, unknown> = {}) {
  const body = { model: MODEL, messages, temperature: 0, ...bodyExtra }; // ← 完整请求体：system 全文就在 messages[0]
  const wire = {
    url: `${BASE_URL}/chat/completions`,
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${maskKey(API_KEY)}` }, // Key 打码
    body,
  };
  const t = Date.now();
  const res = await fetch(wire.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
  const rawBody = await res.text(); // ← 上游原始响应体，一字不丢
  let parsed: any = null;
  try { parsed = JSON.parse(rawBody); } catch { /* 保留原文 */ }
  if (!res.ok) {
    const err: any = new Error(`HTTP ${res.status}`);
    err.upstream = parsed ?? rawBody;
    throw err;
  }
  return {
    content: (parsed?.choices?.[0]?.message?.content ?? "") as string,
    usage: parsed?.usage ?? null,
    finishReason: parsed?.choices?.[0]?.finish_reason ?? null,
    wire: { ...wire, status: `${res.status} ${res.statusText}`, durationMs: Date.now() - t },
    rawBody,
    fullResponse: parsed, // 完整对象：id/created/model/choices[]/usage 全部字段
  };
}

/** 5.3 核心：按档位跑一次会议整理，返回全过程（每步都记录，供页面展示） */
async function runMeeting(notes: string, level: 0 | 1 | 2 | 3) {
  const t0 = Date.now();
  const steps: any[] = [];
  const messages = buildMeetingMessages(notes, level);
  const bodyExtra: Record<string, unknown> = {};
  if (level >= 2) bodyExtra.response_format = { type: "json_object" }; // ② 层硬开关

  const MAX_ATTEMPTS = level >= 3 ? 3 : 1; // ③ 层自愈：最多 3 次尝试
  let lastRaw = "";
  let meeting: Meeting | null = null;
  let usage: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const step: any = { attempt, validations: [] };
    try {
      const r = await chatOnce(messages, bodyExtra);
      lastRaw = r.content;
      usage = r.usage;
      step.raw = r.content;
      step.finishReason = r.finishReason;
      step.wire = r.wire;              // 本次真实请求：url/headers(打码)/完整 body/status/耗时
      step.fullResponse = r.fullResponse; // 上游完整响应对象

      // ① 防围栏
      const cleaned = stripFence(r.content);
      step.fenceStripped = cleaned !== r.content;

      // 语法层：JSON.parse
      let obj: unknown;
      try {
        obj = JSON.parse(cleaned);
        step.parse = { ok: true };
      } catch (e) {
        step.parse = { ok: false, error: e instanceof Error ? e.message : String(e) };
        obj = { __parse_error__: cleaned.slice(0, 300) };
      }

      // 语义层：Zod
      const parsed = MeetingSchema.safeParse(obj);
      if (parsed.success) {
        step.validations.push({ layer: "zod", ok: true });
        step.zodError = null;
        meeting = parsed.data;
        steps.push(step);
        break; // 验收通过
      }
      step.zodError = parsed.error.message.slice(0, 400);
      steps.push(step);

      // ③ self-heal：把失败喂回去（level>=3 才有这一步）
      if (level >= 3 && attempt < MAX_ATTEMPTS) {
        messages.push(
          { role: "assistant", content: r.content },
          { role: "user", content: `输出没通过校验：${parsed.error.message.slice(0, 300)}。修正后重新只输出 JSON，不要围栏不要解释。` },
        );
      }
    } catch (e: any) {
      step.raw = lastRaw;
      step.requestError = e.message;
      if (e.upstream) step.upstream = e.upstream;
      steps.push(step);
      break;
    }
  }

  return {
    level, notes,
    ok: meeting !== null,
    meeting, steps,
    attempts: steps.length,
    durationMs: Date.now() - t0,
    usage,
    model: MODEL,
  };
}
// ================= 5.3 实验台结束 =================

// ---------- 小工具 ----------
const json = (res: ServerResponse, code: number, data: unknown) => {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
};

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 1_000_000) throw new Error("请求体过大");
    chunks.push(Buffer.from(c));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    return {};
  }
}

const LOG_NAME = /^run-[0-9T-]+\.json$/;
async function saveLog(data: unknown) {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const text = JSON.stringify(data, null, 2);
    await writeFile(path.join(LOG_DIR, `run-${stamp}.json`), text, "utf8");
    await writeFile(path.join(LOG_DIR, "last-run.json"), text, "utf8");
  } catch {
    /* 日志失败不影响主流程 */
  }
}

function buildBody(b: any) {
  const temperature = Math.min(2, Math.max(0, Number(b.temperature ?? 1.2)));
  const max_tokens = Math.min(8192, Math.max(1, Math.round(Number(b.maxTokens ?? 200))));
  const messages: { role: string; content: string }[] = [];
  const system = String(b.system ?? "").trim();
  const user = String(b.user ?? "");
  if (system) messages.push({ role: "system", content: system });
  if (user) messages.push({ role: "user", content: user });
  const stream = !!b.stream;
  const body: Record<string, unknown> = {
    model: String(b.model || MODEL),
    messages,
    temperature,
    max_tokens,
  };
  if (stream) Object.assign(body, { stream: true, stream_options: { include_usage: true } });
  return { body, stream };
}

// ---------- /api/call ----------
async function handleCall(req: IncomingMessage, res: ServerResponse) {
  const b = await readBody(req);
  const { body, stream } = buildBody(b);
  const baseUrl = String(b.baseUrl || BASE_URL).replace(/\/+$/, "");
  const key = String(b.apiKey || API_KEY);
  const url = `${baseUrl}/chat/completions`;
  const maskedHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${maskKey(key)}` };
  const t0 = Date.now();

  // 非流式：等完整响应，一次性返回
  if (!stream) {
    let up: Response;
    try {
      up = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (e) {
      const networkError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      const logData = {
        time: new Date().toISOString(), mode: "complete",
        request: { url, method: "POST", headers: maskedHeaders, body },
        response: { status: "网络错误（请求未到达服务器）", headers: null, rawBody: "", parsed: null, finishReason: null, usage: null },
        networkError, durationMs: Date.now() - t0,
      };
      await saveLog(logData);
      json(res, 502, logData);
      return;
    }
    const rawBody = await up.text();
    let parsed: any = null;
    try { parsed = JSON.parse(rawBody); } catch { /* 保留原文 */ }
    const logData = {
      time: new Date().toISOString(), mode: "complete",
      request: { url, method: "POST", headers: maskedHeaders, body },
      response: {
        status: `${up.status} ${up.statusText}`,
        headers: Object.fromEntries(up.headers.entries()),
        rawBody, parsed,
        finishReason: parsed?.choices?.[0]?.finish_reason ?? null,
        usage: parsed?.usage ?? null,
      },
      networkError: null, durationMs: Date.now() - t0,
    };
    await saveLog(logData);
    json(res, 200, logData);
    return;
  }

  // 流式：把上游 SSE 转成 ndjson 实时推给浏览器
  let up: Response;
  try {
    up = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    const networkError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    const logData = {
      time: new Date().toISOString(), mode: "stream",
      request: { url, method: "POST", headers: maskedHeaders, body },
      response: { status: "网络错误（请求未到达服务器）", headers: null, chunkCount: 0, chunks: [], assembledText: "", finishReason: null, usage: null },
      networkError, durationMs: Date.now() - t0,
    };
    await saveLog(logData);
    json(res, 502, logData);
    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Accel-Buffering": "no",
  });
  const send = (o: unknown) => {
    try { res.write(JSON.stringify(o) + "\n"); } catch { /* 客户端断开 */ }
  };

  const requestRec = { url, method: "POST", headers: maskedHeaders, body };
  send({ type: "meta", time: new Date().toISOString(), mode: "stream", request: requestRec, status: `${up.status} ${up.statusText}` });

  const chunks: { t: number; raw: string }[] = [];
  let assembled = "";
  let finishReason: string | null = null;
  let usage: unknown = null;
  let netErr: string | null = null;

  if (!up.ok || !up.body) {
    const rawBody = await up.text();
    let parsed: any = null;
    try { parsed = JSON.parse(rawBody); } catch { /* 保留原文 */ }
    send({ type: "error", status: `${up.status} ${up.statusText}`, rawBody, parsed });
    await saveLog({
      time: new Date().toISOString(), mode: "stream", request: requestRec,
      response: { status: `${up.status} ${up.statusText}`, headers: Object.fromEntries(up.headers.entries()), rawBody, parsed, chunkCount: 0, chunks: [], assembledText: "", finishReason: null, usage: null },
      networkError: null, durationMs: Date.now() - t0,
    });
    res.end();
    return;
  }

  const reader = up.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let i: number;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line) continue;
        const t = Date.now() - t0;
        chunks.push({ t, raw: line });
        send({ type: "chunk", t, raw: line });
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;
        try {
          const j = JSON.parse(payload);
          const delta = j?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta) {
            assembled += delta;
            send({ type: "delta", text: delta });
          }
          if (j?.choices?.[0]?.finish_reason) finishReason = j.choices[0].finish_reason;
          if (j?.usage) {
            usage = j.usage;
            send({ type: "usage", usage: j.usage });
          }
        } catch { /* 非 JSON 行，已在 chunk 里原样展示 */ }
      }
    }
  } catch (e) {
    netErr = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    send({ type: "error", message: netErr });
  }

  const durationMs = Date.now() - t0;
  send({ type: "done", durationMs, chunkCount: chunks.length });
  await saveLog({
    time: new Date().toISOString(), mode: "stream", request: requestRec,
    response: {
      status: `${up.status} ${up.statusText}`,
      headers: Object.fromEntries(up.headers.entries()),
      chunkCount: chunks.length, chunks, assembledText: assembled, finishReason, usage,
    },
    networkError: netErr, durationMs,
  });
  res.end();
}

// ---------- HTTP 路由 ----------
const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  try {
    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(UI_HTML);
      return;
    }
    if (req.method === "GET" && url.pathname === "/5.3") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(LAB53_HTML);
      return;
    }
    if (req.method === "GET" && url.pathname === "/5.4") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(LAB54_HTML);
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/agent") {
      const b = await readBody(req);
      const task = String(b.task ?? "").trim();
      const maxRounds = Math.min(8, Math.max(1, Math.round(Number(b.maxRounds ?? 4))));
      if (!task) { json(res, 400, { error: "task 不能为空" }); return; }
      const result = await runAgent(task, maxRounds);
      try {
        await mkdir(LOG_DIR, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        await writeFile(path.join(LOG_DIR, `agent-${stamp}.json`), JSON.stringify(result, null, 2), "utf8");
      } catch { /* 日志失败不影响主流程 */ }
      json(res, 200, result);
      return;
    }
    // 静态挂载学习文档（只读、限仓库根内 .html），供 /5.3 页面引用
    const doc = url.pathname.match(/^\/docs\/(.+\.html)$/);
    if (req.method === "GET" && doc) {
      const root = path.resolve(here, "..", ".."); // 仓库根
      const rel = path.normalize(decodeURIComponent(doc[1])).replace(/^([a-zA-Z]:)?[\\/]+/, "");
      const target = path.join(root, rel);
      if (!target.startsWith(root + path.sep)) { json(res, 403, { error: "forbidden" }); return; }
      try {
        const text = await readFile(target, "utf8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(text);
      } catch { json(res, 404, { error: "文档不存在" }); }
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/meeting") {
      const b = await readBody(req);
      const notes = String(b.notes ?? "").trim();
      const level = Math.min(3, Math.max(0, Math.round(Number(b.level ?? 3)))) as 0 | 1 | 2 | 3;
      if (!notes) { json(res, 400, { error: "notes 不能为空" }); return; }
      const result = await runMeeting(notes, level);
      // 全过程落盘日志（Key 不进此日志——本端点不发 Key 相关信息）
      try {
        await mkdir(LOG_DIR, { recursive: true });
        const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        await writeFile(path.join(LOG_DIR, `meeting-${stamp}.json`), JSON.stringify(result, null, 2), "utf8");
      } catch { /* 日志失败不影响主流程 */ }
      json(res, 200, result);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/config") {
      json(res, 200, {
        baseUrl: BASE_URL,
        model: MODEL,
        keyMasked: maskKey(API_KEY),
        hasKey: !!API_KEY && !API_KEY.includes("REPLACE-WITH"),
      });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/call") {
      await handleCall(req, res);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/history") {
      await mkdir(LOG_DIR, { recursive: true });
      const files = (await readdir(LOG_DIR)).filter((f) => LOG_NAME.test(f)).sort().reverse();
      const items: unknown[] = [];
      for (const f of files.slice(0, 30)) {
        try {
          const j = JSON.parse(await readFile(path.join(LOG_DIR, f), "utf8"));
          items.push({
            file: f, time: j.time, mode: j.mode,
            status: j.response?.status ?? (j.networkError ? "网络错误" : "?"),
            durationMs: j.durationMs,
          });
        } catch { /* 跳过坏文件 */ }
      }
      json(res, 200, items);
      return;
    }
    const hist = url.pathname.match(/^\/api\/history\/(run-[0-9T-]+\.json)$/);
    if (req.method === "GET" && hist) {
      json(res, 200, JSON.parse(await readFile(path.join(LOG_DIR, hist[1]), "utf8")));
      return;
    }
    json(res, 404, { error: "not found" });
  } catch (e) {
    json(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
});

server.on("error", (e: NodeJS.ErrnoException) => {
  if (e.code === "EADDRINUSE") {
    console.log(`⚠️  端口 ${PORT} 已被占用（可能控制台已经在跑了）。直接打开 http://localhost:${PORT} ，或换端口：UI_PORT=8788 npm run ui`);
    process.exit(1);
  }
  throw e;
});

server.listen(PORT, () => {
  console.log(`✅ first-call 控制台已启动：http://localhost:${PORT}`);
  console.log(`   Key: ${maskKey(API_KEY)}（来自 .env，UI 里可临时覆盖）· 日志目录：logs/`);
  if (process.platform === "win32" && !process.env.UI_NO_OPEN) {
    import("node:child_process").then(({ spawn }) => {
      spawn("cmd", ["/c", "start", "", `http://localhost:${PORT}`], { detached: true, stdio: "ignore" }).unref();
    });
  }
});
