"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface PageProps {
  params: Promise<{ agentSlug: string }>;
}

export default function ChatPage({ params }: PageProps) {
  const [agentSlug, setAgentSlug] = useState<string>("");
  const [agentName, setAgentName] = useState<string>("Agent");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    params.then(({ agentSlug: slug }) => {
      setAgentSlug(slug);
      // Fetch agent name
      fetch(`/api/agents/${slug}`)
        .then((res) => res.json())
        .then((data) => setAgentName(data.name))
        .catch(() => setAgentName(slug));
    });

    // Get conversationId from URL if resuming
    const convId = searchParams.get("conversationId");
    if (convId) {
      setConversationId(convId);
      // Load conversation history
      loadConversationHistory(convId);
    }
  }, [params, searchParams]);

  const loadConversationHistory = async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load conversation history:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          agentSlug,
          conversationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Extract conversation ID from headers
      const convId = response.headers.get("X-Conversation-Id");
      if (convId && !conversationId) {
        setConversationId(convId);
        window.history.replaceState(
          {},
          "",
          `/chat/${agentSlug}?conversationId=${convId}`
        );
      }

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      const assistantId = (Date.now() + 1).toString();

      // Add empty assistant message to show loading
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          assistantMessage += chunk;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: assistantMessage }
                : msg
            )
          );
        }
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      setError(err.message || "Failed to send message");
      // Remove the user message if there was an error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!agentSlug) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-offwhite">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/agents/${agentSlug}`}
              className="text-muted hover:text-nearblack transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral/20 to-purple/20 flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg">{agentName}</h1>
              <p className="text-xs text-muted">AI Assistant</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="text-sm text-muted hover:text-nearblack transition-colors font-medium"
          >
            My Conversations
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-coral/10 to-purple/10 flex items-center justify-center text-3xl mx-auto mb-4">
                🤖
              </div>
              <h2 className="font-heading text-xl font-bold mb-2">
                Start a conversation
              </h2>
              <p className="text-muted">
                Ask me anything and I'll help you out!
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coral/20 to-purple/20 flex items-center justify-center text-sm shrink-0">
                  🤖
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                  message.role === "user"
                    ? "bg-coral text-white"
                    : "bg-white border border-gray-200"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content || (
                    <span className="text-muted">Thinking...</span>
                  )}
                </p>
              </div>
              {message.role === "user" && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coral to-coral-dark flex items-center justify-center text-sm text-white shrink-0">
                  U
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coral/20 to-purple/20 flex items-center justify-center text-sm shrink-0">
                🤖
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted rounded-full animate-bounce"></span>
                  <span
                    className="w-2 h-2 bg-muted rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></span>
                  <span
                    className="w-2 h-2 bg-muted rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-coral text-white font-semibold px-6 py-3 rounded-xl hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-muted text-center mt-2">
            Free plan: 10 messages per day
          </p>
        </form>
      </div>
    </div>
  );
}
