# 实验

**可运行的实验工程**——跨章节长期使用，不随某章完结而过期。

| 工程 | 说明 | 起点 |
|---|---|---|
| [first-call/](first-call/) | LLM API 调用台。**控制台主页 `npm run ui` → `http://localhost:8787/`**（实时调参、实时看 SSE 推送，自动开浏览器）；**`/5.3` 实验台**（结构化输出四档对照，日志落 `logs/meeting-*.json`）；**`/5.4` 实验台**（Function Calling 四步往返：模型⇄read_file 工具完整循环，每轮全量 wire+执行器实况+最终 messages 剧本，日志落 `logs/agent-*.json`）；`npm start` / `npm run stream` 命令行模式；`npx tsx meeting-notes.ts` 会议整理 CLI（Zod+自愈）；每次调用自动产出全量日志（Key 打码） | 第 2 章产出，5.3/5.4 扩展 |

| [chat-app/](chat-app/) | **毕业项目 M1 地基**：Next.js 16 + AI SDK v7 聊天应用（流式 + read_file 工具 + 停止按钮）。`npm run dev` → localhost:3000；`npm run dev` 前 .env 需就位（从 first-call 复制即可）；`data/` 放工具可读的文件 | 第 6 章产出（6.3） |

## 约定

- 每个工程一个子目录，自带 `package.json`；密钥一律放工程内 `.env`，不进代码、不外传
- 章节里的学习型小 demo 仍放对应章目录；只有"长期会反复用"的工程才进这里
- 新增工程后记得更新上面的表格
