# 06 · LLM 应用开发（TS 主场）【精】

> 目标：把模型变成应用。本章产出的聊天应用 = 毕业项目的直接零件。

## 节点清单

- [ ] **6.1 API 接口规范与 SDK** — messages/工具调用字段/usage/错误码；OpenAI 兼容协议：换模型只改 base_url 和 key
- [ ] **6.2 流式输出与前端 UX** — SSE 原理；流式下怎么拿结构化数据
- [ ] **6.3 Vercel AI SDK** — `streamText` / `generateObject` / `tool` / `useChat` 各替你抽象了什么（对照第 5 章手写的代码）；动手：聊天 Web 应用（Next.js + AI SDK，流式 + 工具）
- [ ] **6.4 应用形态** — 聊天/副驾/工作流嵌入；想清楚毕业项目属于哪种
- [ ] **6.5 成本与延迟工程** — 缓存（prompt caching）/模型路由/上下文瘦身
- [ ] **6.6 模型选型与思考模式** — 能力/成本/延迟/上下文长度/推理能力的权衡；何时开推理模型、effort 给多少；产出：给毕业项目列 2–3 个候选模型和理由
- [ ] **6.7 可靠性工程 【浅】** — 超时/重试/限流/降级

## 本章产出

- [ ] 聊天 Web 应用（可演示、可迭代成毕业项目 M1/M2）
- [ ] 模型选型结论一份

## 资源

- [Vercel AI SDK 文档](https://ai-sdk.dev/docs)（主教材，TS 一手）
- [Datawhale llm-universe](https://github.com/datawhalechina/llm-universe)（中文系统课，读它、用 TS 复刻核心章）
- [OpenAI Cookbook](https://cookbook.openai.com/)（要具体代码模式时查）
