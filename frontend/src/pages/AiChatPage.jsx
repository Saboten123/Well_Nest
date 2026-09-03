import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { aiApi } from "../utils/api";
import Navbar from "../components/Navbar";
import "../styles/AiChatPage.css";

function AIChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setError("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    try {
      const res = await aiApi.post("/chat", { message: text });
      const reply = res.data?.reply || "";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Request failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Custom components for markdown rendering
  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const language = match ? match[1] : "";

      if (!inline && language) {
        return (
          <div className="code-block-container">
            <div className="code-block-header">
              <span className="code-language">{language}</span>
              <button
                className="copy-button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    String(children).replace(/\n$/, "")
                  )
                }
                title="Copy code"
              >
                Copy
              </button>
            </div>
            <SyntaxHighlighter
              style={tomorrow}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: "0 0 8px 8px",
                fontSize: "0.875rem",
              }}
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          </div>
        );
      }

      return (
        <code className="inline-code" {...props}>
          {children}
        </code>
      );
    },

    blockquote({ children }) {
      return (
        <blockquote className="markdown-blockquote">{children}</blockquote>
      );
    },

    table({ children }) {
      return <table className="markdown-table">{children}</table>;
    },

    th({ children }) {
      return <th className="markdown-th">{children}</th>;
    },

    td({ children }) {
      return <td className="markdown-td">{children}</td>;
    },

    ul({ children }) {
      return <ul className="markdown-ul">{children}</ul>;
    },

    ol({ children }) {
      return <ol className="markdown-ol">{children}</ol>;
    },

    li({ children }) {
      return <li className="markdown-li">{children}</li>;
    },

    h1({ children }) {
      return <h1 className="markdown-h1">{children}</h1>;
    },

    h2({ children }) {
      return <h2 className="markdown-h2">{children}</h2>;
    },

    h3({ children }) {
      return <h3 className="markdown-h3">{children}</h3>;
    },

    h4({ children }) {
      return <h4 className="markdown-h4">{children}</h4>;
    },

    h5({ children }) {
      return <h5 className="markdown-h5">{children}</h5>;
    },

    h6({ children }) {
      return <h6 className="markdown-h6">{children}</h6>;
    },

    p({ children }) {
      return <p className="markdown-p">{children}</p>;
    },

    a({ href, children }) {
      return (
        <a
          href={href}
          className="markdown-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    },

    strong({ children }) {
      return <strong className="markdown-strong">{children}</strong>;
    },

    em({ children }) {
      return <em className="markdown-em">{children}</em>;
    },
  };

  // Function to render message content
  const renderMessageContent = (message) => {
    if (message.role === "user") {
      return message.content;
    } else {
      // Render assistant messages as markdown
      return (
        <div className="markdown-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-4">AI Health Assistant</h1>
        <div className="bg-white rounded-lg shadow p-4 h-[70vh] flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 && (
              <div className="text-gray-500 text-sm">
                Start a conversation. If signed in, your chat is saved and
                summarized over time. Otherwise, a temporary session is used via
                cookies.
              </div>
            )}
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`message-container ${
                  m.role === "user" ? "text-right" : "text-left"
                }`}
              >
                <div
                  className={`message-bubble ${
                    m.role === "user" ? "user-message" : "assistant-message"
                  }`}
                >
                  {renderMessageContent(m)}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-left">
                <div className="typing-indicator">
                  <span>Assistant is typing</span>
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={sendMessage} className="mt-3 flex gap-2">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ask a health question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={loading || !input.trim()}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </form>
          {error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIChatPage;
