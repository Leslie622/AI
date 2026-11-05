# 05 · Prompt 与上下文工程 【精】

> 目标：掌握控制模型输出的全部手段。这是 Agent 的"语句层"——本章开始，每个概念都要落到 TS 代码。

## 节点清单

- [ ] **5.1 消息结构** — system/user/assistant 各放什么、优先级差异
- [ ] **5.2 Prompt 设计** — 角色/约束/示例（few-shot）/思维链；动手：裸 prompt vs 加角色 vs 加示例 vs 加 CoT 的对照实验，记录稳定性差异
- [ ] **5.3 结构化输出** — 动手：Zod schema + 命令行"会议记录整理器"（随手文字 → 结构化 JSON）；验收：为什么比"求模型输出 JSON"可靠
- [ ] **5.4 Function Calling** — 动手：给脚本加 `read_file` 工具，在代码里标出完整往返四步（模型发意图 → 代码执行 → 结果回喂 → 模型续答）；验收：循环在哪一步、谁决定何时停
- [ ] **5.5 上下文工程** — 系统化设计每次请求带什么（系统指令+检索内容+历史+工具结果）；含上下文压缩与中间遗忘 lost in the middle【浅】；读 Anthropic context engineering 长文
- [ ] **5.6 提示注入（初步认知）** — 为什么用户输入和网页内容都不可信（深入攻防在第 8 章）

## 本章笔记

- [5.1–5.6 六节详解（含 Function Calling 四步往返流程卡、lost in the middle U 形曲线 SVG、五段式 prompt 模板、10 题自检区）](./5.1-5.6-Prompt与上下文工程-详解.html) — 自学主文档；5.1/5.2 用 `实验/first-call` 控制台即可完成，5.3/5.4 文档内附完整脚本（沿用同一 .env，5.3 需 `npm i zod`）
- [5.3 动手实验室：六关卡交互页](./5.3-结构化输出-动手实验室.html) — 离线可玩：两条管道对照 / JSON.parse 验尸 5 样本 / Schema vs Zod 双胞胎 / safeParse 试驾 5 份货 / 自愈循环动画 / 三层方案收拢 + 6 题通关自测
- 🔧 **5.3 真机实验台：`npm run ui` 后开 [http://localhost:8787/5.3](http://localhost:8787/5.3)** — 走真实 API 的四档对照（裸恳求 → +Schema → +response_format → +Zod 自愈），同一段乱笔记反复跑，观察防线逐层生效；独立 CLI 版为 `实验/first-call/meeting-notes.ts`（已跑通）
- 🔧 **5.4 真机实验台：[http://localhost:8787/5.4](http://localhost:8787/5.4)** — Function Calling 四步往返全透明：read_file 工具（白名单 data/）+ MAX_ROUNDS 保险丝，每轮完整请求（含 tools 说明书）/完整响应（含 tool_calls 报文）/执行器实况/最终 messages 剧本全部展开；三场景已验证（正题 2 轮 stop、无工具任务、白名单外文件失败回喂）

## 本章产出

- [ ] 一个带工具调用的 TS 脚本 + 一份对照实验记录（这就是第 6 章聊天应用的引擎零件）

## 资源

- [Anthropic Prompt Engineering 指南](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)（主教材）＋ [OpenAI 指南](https://platform.openai.com/docs/guides/prompt-engineering)（对照，两家共识=行业共识）
- Anthropic《[Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)》
- [Datawhale prompt-engineering-for-developers](https://github.com/datawhalechina/prompt-engineering-for-developers)（中文速成查漏）
