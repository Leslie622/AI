# 02 · 地基 【浅，按需补】

> 目标：环境全部就绪，具备"读懂教程代码"的阅读力。按需补，卡住再学，不预先展开。

## 节点清单

- [ ] **2.1 Python 策略** — 不系统学：能读 + 会用 AI 写 + 人工审代码。半天速成：打开 [llm-universe](https://github.com/datawhalechina/llm-universe) 的教程代码当阅读材料，不懂的语法问 AI
- [ ] **2.2 数学直觉 【了】** — 线代/概率/微积分：知道学 LLM 原理时哪里会用到即可，卡住再补（3Blue1Brown）
- [ ] **2.3 HTTP/JSON/开发环境** — Node LTS + pnpm、Python + uv、Git；你已具备大半，查漏即可

## 本章笔记

- [2.1–2.3 三节详解（含 TS↔Python 对照表、SSE 讲解、first-call.ts 实战与自检区）](./2.1-2.3-地基-详解.html) — 自学主文档；产出实战一节直接对应下面两个硬产出
- [first-call/ API 调用台](../../实验/first-call/) — 本章产出的可运行版，已升级为根目录 `实验/` 下的长期工程：**`npm run ui` 打开本地控制台**（实时调参、实时看 SSE 推送，改 temperature / max_tokens / 角色即刻对照现象）；也有 `npm start` / `npm run stream` 命令行模式；每次调用自动产出全量日志（Key 在该目录 `.env` 里）

## 本章产出（重要，后面所有章节都靠它）

- [ ] 申请一个 LLM API Key（DeepSeek / 智谱 GLM / 硅基流动 / OpenRouter 任选其一，都是 OpenAI 兼容协议）
- [ ] `first-call.ts`：约 20 行 TS 调通第一次对话；亲手改 `messages` / `temperature` / `max_tokens`，观察输出变化

## 资源

- [资源/工具链.md](../../资源/工具链.md)：模型 API 与 TS SDK 部分
- 注意：传统 Python 入门课（CS50P 等）已明确跳过——用上面的"阅读速成"策略即可
