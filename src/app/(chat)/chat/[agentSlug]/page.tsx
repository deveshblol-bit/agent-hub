"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    params.then(({ agentSlug: slug }) => {
      setAgentSlug(slug);
      fetch(`/api/agents/${slug}`)
        .then((res) => res.json())
        .then((data) => setAgentName(data.name))
        .catch(() => setAgentName(slug));
    });

    const convId = searchParams.get("conversationId");
    if (convId) {
      setConversationId(convId);
    }
  }, [params, searchParams]);

  // Smart auto-scroll: only scroll if user is near the bottom
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (shouldAutoScroll.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // Track scroll position to determine if auto-scroll should happen
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 100;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold;
    shouldAutoScroll.current = isNearBottom;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setError(null);
    shouldAutoScroll.current = true;

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          agentSlug,
          conversationId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const convId = response.headers.get("X-Conversation-Id");
      if (convId && !conversationId) {
        setConversationId(convId);
        window.history.replaceState(
          {},
          "",
          `/chat/${agentSlug}?conversationId=${convId}`
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      const assistantId = (Date.now() + 1).toString();

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        const currentText = fullText;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: currentText } : msg
          )
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to send message";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!agentSlug) {
    return (
      <div className="flex items-center justify-center h-dvh bg-offwhite">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-coral"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-offwhite overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 shrink-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href={`/agents/${agentSlug}`}
              className="text-muted hover:text-nearblack transition-colors shrink-0"
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
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-coral/20 to-purple/20 flex items-center justify-center text-lg sm:text-xl shrink-0">
              🤖
            </div>
            <div className="min-w-0">
              <h1 className="font-heading font-bold text-base sm:text-lg truncate">
                {agentName}
              </h1>
              <p className="text-[11px] sm:text-xs text-muted">AI Assistant</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="text-xs sm:text-sm text-muted hover:text-nearblack transition-colors font-medium shrink-0 ml-2"
          >
            <span className="hidden sm:inline">My Conversations</span>
            <span className="sm:hidden">History</span>
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6"
      >
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">
          {messages.length === 0 && (
            <div className="text-center py-16 sm:py-24">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-coral/10 to-purple/10 flex items-center justify-center text-2xl sm:text-3xl mx-auto mb-4">
                🤖
              </div>
              <h2 className="font-heading text-lg sm:text-xl font-bold mb-2">
                Start a conversation
              </h2>
              <p className="text-muted text-sm sm:text-base">
                Ask me anything and I&apos;ll help you out!
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 sm:gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-coral/20 to-purple/20 flex items-center justify-center text-xs sm:text-sm shrink-0 mt-1">
                  🤖
                </div>
              )}
              <div
                className={`rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-coral text-white max-w-[85%] sm:max-w-[70%]"
                    : "bg-white border border-gray-200 max-w-[90%] sm:max-w-[80%]"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-2 prose-headings:font-heading prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-code:text-coral prose-code:bg-gray-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-strong:text-nearblack text-sm leading-relaxed prose-a:text-coral prose-a:no-underline prose-a:font-medium hover:prose-a:underline">
                    {message.content ? (
                      <ReactMarkdown
                        components={{
                          a: ({ node, href, children, ...props }) => {
                            const isMapLink = href?.includes('google.com/maps');
                            const isBookingLink = href?.includes('booking.com') || 
                                                 href?.includes('getyourguide.com') || 
                                                 href?.includes('klook.com') || 
                                                 href?.includes('viator.com');
                            
                            if (isMapLink) {
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-xs font-medium no-underline"
                                  {...props}
                                >
                                  📍 {children}
                                </a>
                              );
                            }
                            
                            if (isBookingLink) {
                              return (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-600 rounded-md hover:bg-green-100 transition-colors text-xs font-medium no-underline"
                                  {...props}
                                >
                                  🔗 {children}
                                </a>
                              );
                            }
                            
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                {...props}
                              >
                                {children}
                              </a>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <span className="text-muted italic">Thinking...</span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}
              </div>
              {message.role === "user" && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-coral to-coral-dark flex items-center justify-center text-xs sm:text-sm text-white shrink-0 mt-1">
                  U
                </div>
              )}
            </div>
          ))}

          {isLoading &&
            messages.length > 0 &&
            messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2 sm:gap-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-coral/20 to-purple/20 flex items-center justify-center text-xs sm:text-sm shrink-0">
                  🤖
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
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
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-3 sm:px-6 py-3 sm:py-4 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 sm:gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Type your message..."
              className="flex-1 resize-none rounded-xl border border-gray-300 px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent text-sm sm:text-base"
              rows={1}
              style={{ maxHeight: 120 }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-coral text-white font-semibold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-coral-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 text-sm sm:text-base"
            >
              <span className="hidden sm:inline">Send</span>
              <svg
                className="w-5 h-5 sm:hidden"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
          <p className="text-[10px] sm:text-xs text-muted text-center mt-1.5 sm:mt-2">
            Free plan: 10 messages per day
          </p>
        </form>
      </div>
    </div>
  );
}
