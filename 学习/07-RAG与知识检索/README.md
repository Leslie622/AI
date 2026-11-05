# 07 · RAG 与知识检索 【精】

> 目标：让模型懂"你的私有知识"。本章大作业（个人知识库）= 毕业项目 M5 零件。

## 节点清单

- [ ] **7.1 为什么需要 RAG** — 同时解决知识截止/私有知识/幻觉三个问题
- [ ] **7.2 文档解析与 chunking** — 为什么切法直接决定质量（固定长度/语义/按结构）
- [ ] **7.3 Embedding 模型与向量库** — 内存数组（暴力余弦）起步理解原理 → [LanceDB](https://lancedb.com/)（嵌入式，适合桌面）
- [ ] **7.4 检索策略** — 相似度/混合检索（BM25+向量）/重排（rerank）
- [ ] **7.5 进阶形态 【浅】** — 查询改写/多路召回/GraphRAG/多模态 RAG
- [ ] **7.6 RAG 评估** — 动手：手写 20 个问答对（问题+期望命中的笔记），通过率 <80% 就回头改 chunking/检索参数——体会"评估驱动迭代"
- [ ] **7.7 引用溯源 【精】** — 答案带出处、可跳原文（做知识库应用刚需）

## 本章笔记

- [7.1–7.7 七节详解（含 RAG 两阶段流程 SVG、溯源链路四段 SVG、chunking 三参数表、检索三层楼、评估闭环与 20 题评测集模板、10 题自检区）](./7.1-7.7-RAG与知识检索-详解.html) — 自学主文档；大作业=毕业项目 M5 零件，前置：embedding API Key（硅基流动/智谱）

## 本章产出（毕业项目 M5 零件）

- [ ] **个人知识库**：把本仓库 `学习/` 和 `资源/` 的 md 做成 RAG 问答（"我的笔记里关于 MCP 都记了什么？"）
- [ ] 20 题评测集，通过率 ≥80%

## 资源

- [vivy-yi/rag-tutorial](https://github.com/vivy-yi/rag-tutorial)（中文 20 章实战，卡住时对照）
- Anthropic《[Contextual Retrieval](https://www.anthropic.com/engineering/contextual-retrieval)》（进阶选读）
- [Datawhale llm-universe](https://github.com/datawhalechina/llm-universe) RAG 章节
