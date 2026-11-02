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
const MODEL = process.env.LLM_MODEL ?? "deepseek-chat";
const LOG_DIR = path.join(here, "logs");

const maskKey = (k: string) =>
  k ? (k.length > 8 ? `${k.slice(0, 4)}****${k.slice(-4)}` : "****") : "(空)";

const UI_HTML = await readFile(path.join(here, "ui.html"), "utf8");

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
