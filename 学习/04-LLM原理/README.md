# 04 · LLM 原理（概念为主）【精】

> 目标：懂 LLM 是什么、怎么来的、有哪些行为特性——概念+亲手验证，不推公式。
> 这是全路线概念密度最高的一章，也是"全景认知"的核心。

## 节点清单

- [ ] **4.1 Token 与 tokenizer**（BPE 分词直觉【了】）— 动手：在 tokenizer playground 粘贴中文长消息/代码，数 token；估算自己应用的成本
- [ ] **4.2 Embedding 与语义向量** — 动手：TS 调 embedding API，算几对句子的相似度（"前端开发" vs "写 CSS" vs "红烧肉做法"）
- [ ] **4.3 Transformer 与注意力（直觉层）** — 只求看懂图："每个词看所有词并加权关注"；不要求复述矩阵运算
- [ ] **4.4 预训练 【浅】** — 下一词预测如何涌现能力；Scaling Law 是什么
- [ ] **4.5 后训练 SFT/RLHF/DPO 【浅】** — 从"补全机器"到"助手"的调教过程
- [ ] **4.6 解码与采样** — 动手：同一 prompt 跑 temperature 0 / 0.7 / 1.5 各 5 次，把观察记进笔记
- [ ] **4.7 上下文窗口与成本** — 验收：为什么长对话越聊越贵？上下文窗口和"记忆"是什么关系？
- [ ] **4.8 幻觉/知识截止** — 验收：为什么幻觉必然存在？什么时候危险？
- [ ] **4.9 推理模型（思考 token）** — 验收：贵在哪、什么场景值得用
- [ ] **4.10 效率概念 【浅】** — MoE/量化/蒸馏/KV 缓存：每个一句话
- [ ] **4.11 多模态 【浅】** — 图/音频怎么"进"模型

## 本章笔记

- [4.1–4.11 十一节详解（含注意力/温度分布/语义空间 SVG 图解、每节动手任务、9 题自检区）](./4.1-4.11-LLM原理-详解.html) — 自学主文档；多数 🔧 动手用 `实验/first-call` 控制台即可完成（4.6 实验记得切 `deepseek-chat`）

## 本章产出

- [ ] 一页纸《给前端工程师的 LLM 原理》——讲给一个"会写代码但没碰过 AI"的同事，讲不清的地方回头重学

## 资源

- ⭐ [3Blue1Brown 神经网络系列](https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi) 第 1–4 集 + attention 特别篇（全路线唯一强烈推荐的视频，官方中字）
- [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/)（只求看懂图）
- Karpathy《[Deep Dive into LLMs](https://www.youtube.com/watch?v=7xTGNNLPyMI)》（3.5h，选看，通勤可听）
- [Hugging Face LLM Course](https://huggingface.co/learn/llm-course) 第 1 章、李宏毅 2025 对应讲次（选看）
- 明细见 [资源/必读文章.md](../../资源/必读文章.md)、[资源/课程.md](../../资源/课程.md)
