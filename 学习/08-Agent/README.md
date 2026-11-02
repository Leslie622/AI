# 08 · Agent（核心目标）【精】

> 目标：从"应用"到"智能体"。8.2 的手写 loop 是**全路线最重要的一个练习**。
> 第一必读：Anthropic《[Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)》（30 分钟，反复读）。

## 节点清单

- [ ] **8.1 Workflow vs Agent 的边界** — 记法：Agent = LLM + 记忆 + 工具 + RAG + MCP + Skills；验收：什么场景该用工作流（多数场景答案=工作流）
- [ ] **8.2 Agent Loop（ReAct）——手写一遍 ⭐** — 不用框架，~100 行 TS：`while` + 工具注册表 + 终止条件 + 消息历史管理；含并行工具调用；给它 read_file/write_file 完成一个真实小任务
- [ ] **8.3 工具设计** — 给模型用的 API 设计：描述怎么写、参数怎么定、错误信息怎么返回
- [ ] **8.4 规划与反思** — 任务分解（先规划再执行 vs 边走边看）【精】；Plan-and-Solve / Reflection / ToT 范式【浅】
- [ ] **8.5 记忆** — 短期：历史管理/截断/压缩【精】；长期落地形态：向量/知识图谱/Mem0 类【浅】
- [ ] **8.6 多智能体** — 编排者-工作者/Handoff/子 Agent（典型：Deep Research 型检索多智能体）；何时不该拆
- [ ] **8.7 MCP 与互操作协议** — MCP（原理/server/client/生态）【精】：动手用 [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) 写一个 server（如"搜索我的学习笔记"），接进 Claude Desktop 或自己的 loop 验证；A2A/ACP/ANP 知道分工【了】
- [ ] **8.8 框架格局（五层）** — L0 裸写 → L1 极简 harness（[pi](https://github.com/mariozechner/pi)，TS，源码小到能读完）→ L2 官方轻量 SDK（OpenAI Agents / Claude Agent SDK）→ L3 编排框架（LangGraph.js）→ L4 整装 harness（[Deep Agents](https://github.com/langchain-ai/deepagents)）→ L5 角色化与低代码（CrewAI/AutoGen/LlamaIndex/Dify/Coze【了】）；实践：读 pi 源码，对照自己 8.2 的实现写 300 字对比
- [ ] **8.9 Agent Skills 【浅】** — 技能包按需加载，与 MCP 互补
- [ ] **8.10 状态持久化与断点恢复（checkpoint）【浅】**
- [ ] **8.11 Computer Use 与浏览器操作 【浅】**
- [ ] **8.12 Agent 常见失败模式与调试 【精】** — 动手：构造一次提示注入（让 Agent 读一个含恶意指令的"笔记"），看它上不上钩，然后修一个防护
- [ ] **8.13 评估与可观测** — 动手：给 8.2 的 loop 加 tracing（每次循环/工具/耗时），回放完整轨迹；了解错误分析/测试集/LLM-as-judge/CI 回归门禁/OpenTelemetry
- [ ] **8.14 安全** — 提示注入/护栏/权限最小化/沙箱/人在环＋工具认证授权（OAuth2/API key 最小权限）
- [ ] **8.15 Agent 交互设计 【精】** — 计划预览/进度可视化/可中断恢复/人工确认弹窗（毕业项目 M6 零件）

## 本章产出

- [ ] 手写 agent loop（可运行）+ 自己的 MCP server + tracing 日志 + 300 字框架对比

## 资源

- Anthropic《Building Effective Agents》★★★ · OpenAI《[A Practical Guide to Building Agents](https://cdn.openai.com/business-guides-and-resources/a-practical-guide-to-building-agents.pdf)》（对照）
- [Datawhale hello-agents](https://github.com/datawhalechina/hello-agents)（中文主线补充）、[Agent-Learning-Hub](https://github.com/datawhalechina/Agent-Learning-Hub)（9 阶段路线交叉验证）
- [MCP 官方文档](https://modelcontextprotocol.io/)、[HF Agents Course](https://huggingface.co/learn/agents-course)（选读）
