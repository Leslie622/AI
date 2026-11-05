"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";

export default function Home() {
  const { messages, sendMessage, stop, status, error } = useChat();
  const [input, setInput] = useState("");

  const busy = status === "streaming" || status === "submitted";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    sendMessage({ text: input });
    setInput("");
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: 24,
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>聊天应用 · 毕业项目 M1 地基</h1>
      <p style={{ color: "#888", fontSize: 13, margin: "0 0 16px" }}>
        流式 + read_file 工具（试试：「帮我看看 data 目录里的 todo.md，总结有哪几件事」）
      </p>

      {/* 消息列表 */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ color: "#aaa", textAlign: "center", marginTop: 60 }}>
            说点什么，或让它读 data/ 里的文件
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              background: m.role === "user" ? "#4f46e522" : "#88888818",
              borderRadius: 12,
              padding: "8px 14px",
              whiteSpace: "pre-wrap",
              fontSize: 14.5,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>
              {m.role === "user" ? "你" : "助手"}
            </div>

            {/* parts：v7 的消息是部件数组（文本/工具调用混排） */}
            {m.parts.map((p, i) => {
              if (p.type === "text") {
                return (
                  <div key={i}>
                    {p.text}
                    {m.role === "assistant" &&
                      i === m.parts.length - 1 &&
                      status === "streaming" && <span style={{ color: "#4f46e5" }}>▍</span>}
                  </div>
                );
              }
              if (p.type.startsWith("tool-")) {
                const state = (p as { state?: string }).state;
                return (
                  <div
                    key={i}
                    style={{
                      margin: "6px 0",
                      padding: "6px 10px",
                      background: "#d9770618",
                      borderRadius: 8,
                      fontSize: 12.5,
                      color: "#b45309",
                    }}
                  >
                    🔧 工具调用 {p.type.replace("tool-", "")}
                    {state === "output-available" ? " ✓ 完成" : ""}
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}
        {error && <div style={{ color: "#dc2626", fontSize: 13 }}>出错：{error.message}</div>}
      </div>

      {/* 输入区 */}
      <form onSubmit={submit} style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={busy ? "生成中…" : "输入消息…"}
          disabled={busy}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            fontSize: 14,
          }}
        />
        {busy ? (
          <button
            type="button"
            onClick={() => stop()}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "#dc2626",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            停止
          </button>
        ) : (
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "#4f46e5",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            发送
          </button>
        )}
      </form>
    </main>
  );
}
