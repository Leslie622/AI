# AGENTS.md — AI 协作说明（每次会话先读我）

## 这个项目是什么

- 个人 AI/Agent 系统学习项目，长期（数月量级）。仓库 = 知识大纲 + 学习记录 + 资源库。
- 学习者：前端工程师，TypeScript 熟练，无 Python 基础（策略：能读 + 会用 AI 写 + 人工审代码，不系统学 Python）。
- 最终目标：**自研一个 Agent 桌面应用**（Electron + TS）。学习动机是"全景认知 + 能构建"，不是研究。
- 偏好：中文交流、中文文字资料优先（视频默认"选看"，例外：3Blue1Brown）；不排期，按大纲章号顺序推进；概念优先、原理到直觉为止——不推公式、不精读论文。

## 仓库结构与职责

| 路径 | 职责 |
|---|---|
| `知识大纲.md` | 唯一知识大纲（11 章，节点带【精】/【浅】/【了】标签）。**稳定的地图，不写任何状态标记**；修改必须由学习者明确提出 |
| `学习/01…11-各章/` | 学习过程与产物所在。**每章 README 的 checkbox 是唯一进度记录**；笔记、demo 都放对应章目录下（命名建议：`4.1-token-笔记.md`、`6.3-ai-sdk-demo/`） |
| `实验/` | 可运行的**长期**实验工程（跨章节使用，索引见其 README），如 first-call API 调用台；新工程默认放这里，章节内一次性小 demo 仍放章目录 |
| `资源/` | 素材库（课程/文章/工具/信息源/术语表）。新资源进对应分册末尾"待审区"，收录三关：一手来源？免费？文字优先？ |
| `README.md` | 给人看的入口 |

## AI 协作规范

1. **恢复上下文**：每次会话开始，读本文件 + `知识大纲.md` + 学习者当前章节的 README（含其中笔记），即可接续工作。
2. **讲解节点**：先看该节点的精浅标签决定深度——【精】给动手任务和验收问题；【浅】讲到"能给别人讲明白"为止；【了】三五句话即可。类比优先从 React/前端工程经验找。
3. **进度记录**：学完一个节点，把对应章 README 的 checkbox 勾上；产出的笔记/demo 放进该章目录。
4. **大纲纪律**：不改 `知识大纲.md`，除非学习者明确要求；发现大纲缺漏，先提建议、经确认再改。
5. **深浅原则**：学习者"概念够用就好"，不要主动展开数学推导、论文精读或框架源码逐行分析；一切解释服务于"能构建应用"。
6. **资源**：优先一手官方文档 > 成熟教程 > 二手转述；引用资源时给链接；新资源先进"待审区"。
7. 全程使用中文。

## 当前状态（AI 每次收尾时更新此节）

- 2026-11-01：大纲 v2 定稿（经国际课程 + 中文社区两轮外部校验）；学习目录已建立；尚未开始学习，当前起点：第 1 章。
- 2026-11-02：产出第 1 章详解文档（`1.1-1.5-全景与格局-详解.html`）、第 2 章详解文档（`2.1-2.3-地基-详解.html`）、第 3 章详解文档（`3.1-3.5-机器学习与神经网络-详解.html`）与第 4 章详解文档（`4.1-4.11-LLM原理-详解.html`，【精】章，每节配动手任务，多数可用 `实验/first-call` 控制台完成），均已在各章 README 挂"本章笔记"链接。同日仓库已初始化 git 并推送到 `https://github.com/Leslie622/AI.git`（main 分支）；根目录 `.gitignore` 已排除 `.env`（含真实 API Key，**任何时候不得提交**）与 `node_modules`。另建长期实验工程 `实验/first-call/`（LLM API 调用台：`npm run ui` 本地控制台——实时调参、实时看 SSE 推送；`npm start`/`npm run stream` 命令行模式；全量日志落 logs/；已用真实 Key 跑通 HTTP 200），仓库新增根目录 `实验/` 并同步了 AGENTS/README 的结构说明。两章 checkbox 均未勾；接续点：第 1 章自检 → 通过后逐章推进。
- 2026-11-03：产出第 5 章详解文档（`学习/05-Prompt与上下文工程/5.1-5.6-Prompt与上下文工程-详解.html`，【精】章：消息结构/Prompt 四件套/结构化输出三层方案/Function Calling 四步往返/上下文工程与 lost in the middle/提示注入初步；内附完整可跑的 meeting-notes.ts（Zod+校验+重试）与 tool-loop.ts（read_file 工具循环）脚本，已在章 README 挂链接）。1–5 章 checkbox 均未勾；接续点：第 5 章讲解 → 用户消化后按需推进第 6 章或回头收自检/动手欠账。
- 2026-11-05：5.3 实验台上线（`实验/first-call/` 新增路由 `GET /5.3` + `POST /api/meeting`，文件 lab53.html + server.ts 扩展，现有 `/` 控制台未动）：四档防线对照（裸恳求/＋Schema/＋response_format/＋Zod 自愈）走真实 API，全过程逐步展示并落盘 `logs/meeting-*.json`（无 Key）。已端到端验证：档 0 抓到"中文键名"活教材（parse 过、Zod 拦），档 2/3 一次过。`meeting-notes.ts` CLI 落盘并跑通（zod 已装）。另产出离线交互页 `学习/05-Prompt与上下文工程/5.3-结构化输出-动手实验室.html`（六关卡）。踩坑记录：Git Bash 的 curl 发中文 JSON 会编码错乱导致上游挂起到超时——本地测试一律用 Node fetch 探针。
- 2026-11-05（续）：**5.4 实验台上线**（`GET /5.4` + `POST /api/agent`，lab54.html + server.ts runAgent()）：Function Calling 四步往返全透明演示——read_file 工具（白名单 data/，path.basename 防穿越）+ MAX_ROUNDS 保险丝（默认 4，页面可调），每轮展示 A 完整请求（含 tools 说明书与当时全部 messages）/B 完整响应（含 tool_calls 报文原文）/C 意图报文（arguments 字符串要点）/D 执行器实况（失败也回喂）/E 最终回答，附最终完整 messagesFinal 剧本折叠区。日志落 `logs/agent-*.json`（无 Key）。三场景端到端验证：①正题"总结 todo.md"= 2 轮完成（tool_calls→stop），messagesFinal: system→user→assistant→tool→assistant；②"天气怎么样"= 模型主动试了 weather.md/txt 两个文件名后放弃并说明无权限——失败回喂的容错活教材；③"读 secrets.txt"= 执行器返回 ENOENT，模型如实转告。新增 `data/todo.md` 实验数据文件；server 新增 `/docs/` 静态路由（白名单仓库内 .html，路径穿越 403）供实验台引用学习文档；主页 ui.html 加 /5.3、/5.4 徽章入口。**教学提醒：/5.x 是路由页，必须 http://localhost:8787/5.x 访问，双击文件打开会让相对路径 fetch 全炸**。
- 2026-11-05（再续）：产出第 6 章详解文档（学习/06-LLM应用开发/6.1-6.7-LLM应用开发-详解.html，【精】章：错误码四大家族/AI SDK 四大件×first-call 手搓代码逐项对照/三种应用形态——毕业项目定位为外壳聊天+内核工作流+副驾式上下文采集三层叠加/缓存经济学/模型选型五维度与 effort 策略/可靠性四件套；6.3 动手=Next.js+AI SDK 聊天应用，建议落位 实验/chat-app/（毕业项目 M1 地基），尚未动工，用户要搭时再搭）。已在章 README 挂链接。1–6 章 checkbox 均未勾；接续点：第 6 章讲解 → 6.3 聊天应用动工或先收前几章欠账。
- 2026-11-05（三续）：**6.3 聊天应用已落地跑通**（实验/chat-app/，Next.js 16 + AI SDK v7 + zod 4 + @ai-sdk/react；app/api/chat/route.ts = streamText + read_file 工具（inputSchema，path.basename 白名单，data/ 目录）+ stepCountIs(5)；app/page.tsx = useChat 界面：流式渲染 parts/tool 部件状态/停止按钮）。端到端验收：纯对话流式（18 delta，首字 816ms）✓、工具调用（read_file todo.md→320 字符→回喂→380 字符总结）✓。.env 从 first-call 复制（不入库），data/todo.md 就位。产出配套讲解文档 学习/06-LLM应用开发/6.3-chat-app-逐行讲解.html（全景图+逐段对照+版本坑）。**踩坑记录（AI SDK v7）**：①tool 的 schema 字段 parameters→改名 inputSchema；②Next.js 原生加载 .env 不需要 dotenv（import 会 Module not found）；③convertToModelMessages 返回 Promise 要 await。元教训：读 node_modules/*.d.ts 比搜教程快。用户可自行 npm run dev 打开 localhost:3000 玩。
- 2026-11-05（四续）：产出第 7 章详解文档（学习/07-RAG与知识检索/7.1-7.7-RAG与知识检索-详解.html，【精】章：RAG 三问题与两阶段流程图/chunking 三参数/数组→LanceDB 路线/检索三层楼/评估闭环 20 题/溯源四段链路；大作业=个人知识库=毕业项目 M5 零件，前置 embedding Key（硅基流动/智谱，DeepSeek 无 embedding API），用户拿到 Key 后帮搭 7.3 相似度脚本与评测管道）。已挂章 README。1–7 章 checkbox 均未勾；接续点：第 7 章讲解 → 大作业动工或收前几章欠账。
- 2026-11-05（五续）：产出第 8 章详解文档（学习/08-Agent/8.1-8.15-Agent-详解.html，【精】核心目标章：Workflow vs Agent 边界/Agent Loop 五大件完整骨架（工具注册表+终止条件+历史管理+并行执行，~100行）/工具设计四要素/规划混合正解/记忆三策略/多Agent三模式与不拆清单/MCP server 完整示例（notes-search）/框架五层地图/Skills·Checkpoint·Computer Use【浅】/五大失败模式定位表/tracing 三要素与评估栈/安全防御栈与人在环/交互四件套（依赖手写循环插桩）；8.2 手写 Loop=全路线最重要练习，落位 实验/agent-lab/ 未建）。已挂章 README。1–8 章 checkbox 均未勾；接续点：第 8 章讲解 → 8.2 agent-lab 动工或收前几章欠账。
