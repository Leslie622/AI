// first-call.ts —— 第一个 LLM API 调用：全量日志 + HTML 报告
//
// 用法（在本目录下）：
//   npm start          非流式：看 API 完整 JSON 响应
//   npm run stream     流式：看 SSE 原始推送（"打字机效果"的原材料）
//
// 每次运行产出：
//   report.html        可读报告（请求/响应/耗时全记录）← 直接用浏览器打开
//   logs/last-run.json 结构化日志（供程序或 AI 阅读）
//   logs/run-<时间戳>.json 每次运行的历史留档
import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

// ---------- 路径与模式 ----------
const here = path.dirname(fileURLToPath(import.meta.url));
const STREAM = process.argv.includes("--stream");

// ---------- 配置（都从 .env 读） ----------
const BASE_URL = (process.env.LLM_BASE_URL ?? "https://api.deepseek.com").replace(/\/+$/, "");
const API_KEY = process.env.LLM_API_KEY ?? "";
const MODEL = process.env.LLM_MODEL ?? "deepseek-chat";
const keyUnfilled = !API_KEY || API_KEY.includes("在这里") || API_KEY.includes("REPLACE-WITH");
// HTTP 头只允许 Latin-1 字符：Key 里混入中文等字符时换无效占位 Key，让请求照常发出（能看到 401 的真实形状）
const keyNonAscii = /[^\x20-\x7e]/.test(API_KEY);
const authKey = keyNonAscii ? "sk-INVALID-PLACEHOLDER" : API_KEY;
const showKeyBadge = keyUnfilled || keyNonAscii;

// ---------- 请求体 ----------
const body: Record<string, unknown> = {
  model: MODEL,
  messages: [
    { role: "system", content: "你是一个文言文翻译官，只输出译文。" },
    { role: "user", content: "翻译：我从今天开始系统学习 AI 了。" },
  ],
  temperature: 1.2,
  max_tokens: 200,
};
if (STREAM) Object.assign(body, { stream: true, stream_options: { include_usage: true } });

const url = `${BASE_URL}/chat/completions`;
const maskedKey = keyNonAscii
  ? "(占位符)"
  : API_KEY
    ? API_KEY.length > 8
      ? `${API_KEY.slice(0, 4)}****${API_KEY.slice(-4)}`
      : "****"
    : "(空)";

// ---------- 发请求 ----------
const t0 = Date.now();
let res: Response | null = null;
let netError: string | null = null;
try {
  res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authKey}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60_000),
  });
} catch (e) {
  netError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}

// ---------- 收集响应数据 ----------
interface ChunkRec { t: number; raw: string }
let rawBody = "";
let parsed: any = null;
let chunks: ChunkRec[] = [];
let assembled = "";
let finishReason: string | null = null;
let usage: unknown = null;

if (res && STREAM && res.ok && res.body) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      chunks.push({ t: Date.now() - t0, raw: line });
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload);
        const delta = j?.choices?.[0]?.delta?.content;
        if (typeof delta === "string") assembled += delta;
        if (j?.choices?.[0]?.finish_reason) finishReason = j.choices[0].finish_reason;
        if (j?.usage) usage = j.usage;
      } catch { /* 非 JSON 行，原样留在 chunks 里 */ }
    }
  }
} else if (res) {
  rawBody = await res.text();
  try { parsed = JSON.parse(rawBody); } catch { /* 保留原文 */ }
  usage = parsed?.usage ?? null;
  finishReason = parsed?.choices?.[0]?.finish_reason ?? null;
}

const durationMs = Date.now() - t0;
const status = res ? `${res.status} ${res.statusText}` : "网络错误（请求未到达服务器）";
const replyText = STREAM ? assembled : (parsed?.choices?.[0]?.message?.content ?? null);

// ---------- 结构化日志 ----------
const resHeaders = res ? Object.fromEntries(res.headers.entries()) : null;
const logData = {
  time: new Date().toISOString(),
  mode: STREAM ? "stream" : "complete",
  keyUnfilled,
  request: {
    url,
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${maskedKey}` },
    body,
  },
  response: STREAM
    ? { status, headers: resHeaders, chunkCount: chunks.length, chunks, assembledText: assembled, finishReason, usage }
    : { status, headers: resHeaders, rawBody, parsed, finishReason, usage },
  networkError: netError,
  durationMs,
};

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const logDir = path.join(here, "logs");
await mkdir(logDir, { recursive: true });
const logJson = JSON.stringify(logData, null, 2);
await writeFile(path.join(logDir, `run-${stamp}.json`), logJson, "utf8");
await writeFile(path.join(logDir, "last-run.json"), logJson, "utf8");

// ---------- 生成 HTML 报告 ----------
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function hi(jsonStr: string): string {
  return esc(jsonStr).replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?([eE][+-]?\d+)?/g,
    (m, str: string | undefined, colon: string | undefined) => {
      if (str) return `<span class="${colon ? "k" : "s"}">${str}</span>${colon ?? ""}`;
      if (m === "true" || m === "false" || m === "null") return `<span class="b">${m}</span>`;
      return `<span class="n">${m}</span>`;
    },
  );
}
const pretty = (obj: unknown) => hi(JSON.stringify(obj, null, 2));
const statusCls = netError ? "bad" : res && res.ok ? "ok" : "warn";

const curlMasked =
  `curl -X POST "${url}" \\\n` +
  `  -H "Content-Type: application/json" \\\n` +
  `  -H "Authorization: Bearer ${maskedKey}" \\\n` +
  `  -d '${JSON.stringify(body)}'`;

const MAX_CHUNKS = 400;
const chunksHtml = chunks.length
  ? `<table><tr><th>#</th><th>到达时刻(ms)</th><th>原始行</th></tr>` +
    chunks.slice(0, MAX_CHUNKS).map(
      (c, i) => `<tr><td class="mono">${i + 1}</td><td class="mono">${c.t}</td><td class="mono">${esc(c.raw)}</td></tr>`,
    ).join("") +
    `</table>` +
    (chunks.length > MAX_CHUNKS ? `<p class="muted">（共 ${chunks.length} 行，仅展示前 ${MAX_CHUNKS} 行，完整数据在 logs/last-run.json）</p>` : "")
  : `<p class="muted">（无）</p>`;

const bodyHtml = STREAM
  ? `<h2>SSE 原始推送（${chunks.length} 行）</h2><p class="muted">这就是 2.3 讲的打字机原材料：一行行 <code>data: {...}</code>，直到 <code>data: [DONE]</code>。</p>${chunksHtml}`
  : `<h2>响应体（原始）</h2><pre>${parsed ? pretty(parsed) : esc(rawBody || "（空）")}</pre>`;

const assembledHtml = STREAM && assembled
  ? `<h2>逐块拼出来的完整回复</h2><blockquote>${esc(assembled)}</blockquote>`
  : replyText
    ? `<h2>模型回复</h2><blockquote>${esc(replyText)}</blockquote>`
    : "";

const hint = netError
  ? "请求没能到达服务器：检查网络，或确认该 BASE_URL 在你的网络环境下可直连（见 .env 注释里的各家地址）。"
  : !res!.ok
    ? " 401/403 → Key 无效或没填，打开 .env 检查；404 → BASE_URL 不对（对照 .env 注释）；429 → 触发限流，稍后再试；其余看响应体里的错误信息。"
    : "成功。试试 npm run stream 看流式版本，或改 .env 里的 LLM_BASE_URL / LLM_MODEL 换厂商。";

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>first-call 运行报告 · ${esc(status)}</title>
<style>
  :root {
    --bg: #f6f6f8; --fg: #1c1c22; --muted: #6d6d7a; --card: #ffffff; --border: #e3e3ea;
    --accent: #4f46e5; --accent-soft: rgba(79, 70, 229, .08); --code-bg: #ececf2;
    --ok: #16a34a; --ok-soft: rgba(22, 163, 74, .1); --warn: #d97706; --warn-soft: rgba(217, 119, 6, .12); --bad: #dc2626; --bad-soft: rgba(220, 38, 38, .1);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #141419; --fg: #e7e7ee; --muted: #9c9cab; --card: #1d1d26; --border: #2d2d3a;
      --accent: #8f94f8; --accent-soft: rgba(143, 148, 248, .12); --code-bg: #26262f;
      --ok: #4ade80; --ok-soft: rgba(74, 222, 128, .12); --warn: #fbbf24; --warn-soft: rgba(251, 191, 36, .12); --bad: #f87171; --bad-soft: rgba(248, 113, 113, .12);
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font-size: 15px; line-height: 1.7; }
  .wrap { max-width: 920px; margin: 0 auto; padding: 36px 20px 60px; }
  h1 { font-size: 22px; margin: 0 0 10px; }
  h2 { font-size: 17px; margin: 30px 0 8px; }
  .badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 4px; }
  .badge { font-size: 13px; padding: 3px 12px; border-radius: 999px; background: var(--code-bg); color: var(--muted); }
  .badge.s { font-weight: 600; }
  .badge.ok { background: var(--ok-soft); color: var(--ok); }
  .badge.warn { background: var(--warn-soft); color: var(--warn); }
  .badge.bad { background: var(--bad-soft); color: var(--bad); }
  .hint { background: var(--card); border: 1px solid var(--border); border-left: 4px solid var(--accent); border-radius: 10px; padding: 10px 14px; margin: 14px 0; font-size: 14px; }
  pre { background: var(--code-bg); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; overflow-x: auto; font-size: 13px; line-height: 1.6; margin: 8px 0; }
  code { background: var(--code-bg); border-radius: 5px; padding: 1px 5px; font-size: .88em; }
  pre code { background: none; padding: 0; }
  .mono { white-space: nowrap; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 12.5px; }
  th, td { text-align: left; padding: 5px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
  th { color: var(--muted); font-weight: 500; }
  td.mono { white-space: pre-wrap; word-break: break-all; }
  blockquote { margin: 10px 0; padding: 12px 16px; background: var(--card); border: 1px solid var(--border); border-radius: 10px; }
  .k { color: #7c3aed; } .s { color: #0d9488; } .n { color: #b45309; } .b { color: #dc2626; }
  @media (prefers-color-scheme: dark) { .k { color: #a78bfa; } .s { color: #2dd4bf; } .n { color: #fbbf24; } .b { color: #f87171; } }
  .muted { color: var(--muted); font-size: 13px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>first-call 运行报告</h1>
  <div class="badges">
    <span class="badge s ${statusCls}">${esc(status)}</span>
    <span class="badge">${STREAM ? "流式 SSE" : "非流式"}</span>
    <span class="badge">${esc(MODEL)}</span>
    <span class="badge">耗时 ${durationMs} ms</span>
    ${STREAM ? `<span class="badge">${chunks.length} 行推送</span>` : ""}
    ${showKeyBadge ? `<span class="badge warn">Key 未填（占位 Key 试跑）</span>` : ""}
  </div>
  <div class="hint">${esc(hint)}</div>

  <h2>请求</h2>
  <p class="muted">等价的 curl 命令（Key 已打码）：</p>
  <pre>${esc(curlMasked)}</pre>
  <p class="muted">请求体（messages / temperature / max_tokens 的含义见《2.1-2.3 地基详解》产出实战一节）：</p>
  <pre>${pretty(body)}</pre>

  ${resHeaders ? `<h2>响应头</h2><pre>${pretty(resHeaders)}</pre>` : ""}
  ${bodyHtml}
  ${assembledHtml}
  ${usage ? `<h2>Token 用量（usage）</h2><pre>${pretty(usage)}</pre>` : ""}

  <p class="muted">生成于 ${esc(new Date().toISOString())} · 结构化日志：logs/last-run.json · 改完 .env 后重新 <code>npm start</code> 或 <code>npm run stream</code> 即可刷新本报告</p>
</div>
</body>
</html>`;

await writeFile(path.join(here, "report.html"), html, "utf8");

// ---------- 控制台摘要 ----------
if (netError) {
  console.log(`❌ ${netError}`);
  console.log("💡 网络不可达：检查网络，或换 .env 里可直连的服务商。报告已生成（含错误详情）。");
} else if (!res!.ok) {
  console.log(`⚠️  HTTP ${res!.status} ${res!.statusText} · 耗时 ${durationMs}ms`);
  if (res!.status === 401 || res!.status === 403) console.log("💡 Key 无效或未填：打开本目录 .env，把 LLM_API_KEY 换成真实 Key。");
  else if (res!.status === 404) console.log("💡 404：BASE_URL 大概率不对，对照 .env 里的注释检查。");
  else if (res!.status === 429) console.log("💡 429 限流：等一会儿再试。");
  console.log(`💡 响应体已记录，浏览器打开 report.html 看详情。`);
} else {
  console.log(`✅ HTTP ${res!.status} · ${STREAM ? `${chunks.length} 行 SSE 推送` : "完整响应"} · 耗时 ${durationMs}ms`);
  if (replyText) console.log(`💬 回复：${replyText}`);
  if (usage) console.log(`📊 usage: ${JSON.stringify(usage)}`);
  console.log(`📄 报告已生成：${path.join(here, "report.html")}（浏览器打开看完整请求/响应）`);
}
