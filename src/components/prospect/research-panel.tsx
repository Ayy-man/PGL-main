"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Clock, SendHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import type { ScrapbookCard } from "@/types/research";
import { ResearchResultCard } from "./research-result-card";

interface ResearchPanelProps {
  prospectId: string;
  prospect: {
    id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    title: string | null;
    company: string | null;
    location: string | null;
    manual_photo_url: string | null;
    contact_data: { photo_url?: string } | null;
    intelligence_dossier: { summary?: string } | null;
  };
  orgId: string;
}

type StreamPhase = "idle" | "reasoning" | "tool" | "shimmer" | "cards" | "sources" | "complete";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards?: ScrapbookCard[];
  sources?: Array<{ url: string; title: string }>;
  metadata?: {
    reasoning?: string;
    toolStatus?: string;
    resultCount?: number;
  };
}

interface SessionListItem {
  id: string;
  created_at: string;
  first_query: string;
  result_count: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ResearchPanel({ prospectId, prospect, orgId }: ResearchPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [streamPhase, setStreamPhase] = useState<StreamPhase>("idle");
  const [currentCards, setCurrentCards] = useState<ScrapbookCard[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [streamingReasoning, setStreamingReasoning] = useState<string>("");
  const [reasoningCollapsed, setReasoningCollapsed] = useState(false);
  const [toolStatus, setToolStatus] = useState<string>("");
  const [lowRelevanceCollapsed, setLowRelevanceCollapsed] = useState(true);
  const [streamingCards, setStreamingCards] = useState<ScrapbookCard[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentMessageIdRef = useRef<string | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingCards, streamPhase]);

  // Fetch suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/prospects/${prospectId}/research/suggestions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: prospect.full_name,
            title: prospect.title,
            company: prospect.company,
            summary: prospect.intelligence_dossier?.summary,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions ?? []);
        }
      } catch {
        // Silent fail — suggestions are optional
      }
    };
    if (messages.length === 0) {
      fetchSuggestions();
    }
  }, [prospectId, prospect, messages.length]);

  // Auto-resize textarea
  const handleTextareaInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 20;
    const maxHeight = lineHeight * 3 + 24; // 3 lines + padding
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
  };

  const handleSend = useCallback(
    async (query: string) => {
      if (!query.trim() || isSearching) return;

      setIsSearching(true);
      setStreamPhase("reasoning");
      setStreamingReasoning("");
      setReasoningCollapsed(false);
      setToolStatus("");
      setStreamingCards([]);
      setSuggestions([]); // hide after first query
      setInputValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      const userMsgId = generateId();
      setMessages((prev) => [
        ...prev,
        { id: userMsgId, role: "user", content: query },
      ]);

      const assistantMsgId = generateId();
      currentMessageIdRef.current = assistantMsgId;

      try {
        const response = await fetch(`/api/prospects/${prospectId}/research`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, session_id: sessionId }),
        });

        if (response.status === 429) {
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMsgId,
              role: "assistant",
              content: "Daily research limit reached. Resets at midnight UTC.",
            },
          ]);
          setIsSearching(false);
          setStreamPhase("idle");
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        const cards: ScrapbookCard[] = [];
        const sources: Array<{ url: string; title: string }> = [];
        let buffer = "";
        let newSessionId = sessionId;
        let reasoningText = "";
        let assistantContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;

            try {
              const event = JSON.parse(raw);
              const { type } = event;

              if (type === "session") {
                newSessionId = event.session_id;
                setSessionId(event.session_id);
              } else if (type === "reasoning") {
                reasoningText += event.content ?? "";
                setStreamingReasoning(reasoningText);
                setStreamPhase("reasoning");
              } else if (type === "tool_call") {
                setStreamPhase("tool");
                setToolStatus(event.status ?? "Searching web...");
              } else if (type === "shimmer") {
                setStreamPhase("shimmer");
                setReasoningCollapsed(true);
              } else if (type === "card") {
                const card: ScrapbookCard = event.card;
                cards.push(card);
                setStreamingCards((prev) => [...prev, card]);
                setStreamPhase("cards");
              } else if (type === "source") {
                sources.push(event.source);
                setStreamPhase("sources");
              } else if (type === "content") {
                assistantContent += event.content ?? "";
              } else if (type === "complete") {
                setStreamPhase("complete");
              }
            } catch {
              // Skip malformed events
            }
          }
        }

        const finalContent =
          assistantContent ||
          (cards.length > 0
            ? `Found ${cards.length} result${cards.length !== 1 ? "s" : ""}`
            : "No results found for your query.");

        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: "assistant",
            content: finalContent,
            cards,
            sources,
            metadata: { reasoning: reasoningText, resultCount: cards.length },
          },
        ]);
        setStreamingCards([]);
        setCurrentCards(cards);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: "assistant",
            content: "Research failed. Please try again.",
          },
        ]);
      } finally {
        setIsSearching(false);
        setStreamPhase("idle");
        setStreamingReasoning("");
        setToolStatus("");
        setStreamingCards([]);
      }
    },
    [prospectId, sessionId, isSearching]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(inputValue);
    }
  };

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await fetch(
        `/api/prospects/${prospectId}/research/sessions`
      );
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadSession = async (id: string) => {
    setShowSessionHistory(false);
    try {
      const res = await fetch(
        `/api/prospects/${prospectId}/research/sessions/${id}`
      );
      if (!res.ok) return;
      const data = await res.json();
      setSessionId(id);
      setMessages(
        (data.messages ?? []).map((m: {
          id: string;
          role: "user" | "assistant";
          content: string;
          result_cards?: ScrapbookCard[];
          metadata?: { reasoning?: string; resultCount?: number };
        }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          cards: m.result_cards ?? [],
          metadata: m.metadata,
        }))
      );
    } catch {
      // ignore
    }
  };

  const startNewSession = () => {
    setSessionId(null);
    setMessages([]);
    setCurrentCards([]);
    setStreamingCards([]);
    setShowSessionHistory(false);
  };

  const photoUrl =
    prospect.manual_photo_url || prospect.contact_data?.photo_url || null;

  // Group messages: find the last assistant message's cards for low-relevance grouping
  const getCardGroups = (cards: ScrapbookCard[]) => {
    const high = cards.filter(
      (c) => c.relevance !== "low" && c.answer_relevance !== "background"
    );
    const low = cards.filter(
      (c) => c.relevance === "low" || c.answer_relevance === "background"
    );
    return { high, low };
  };

  return (
    <div
      className="flex flex-col h-full"
      style={{ minHeight: 0 }}
    >
      {/* Prospect Context Strip */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(212,175,55,0.04))",
          borderBottom: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
        }}
      >
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-semibold"
          style={{
            background: "rgba(212,175,55,0.15)",
            color: "var(--gold-primary, #d4af37)",
          }}
        >
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={prospect.full_name}
              className="w-full h-full object-cover"
            />
          ) : (
            getInitials(prospect.full_name)
          )}
        </div>

        {/* Name + Title */}
        <div className="flex-1 min-w-0">
          <div
            className="font-sans font-semibold truncate"
            style={{
              fontSize: "14px",
              color: "var(--text-primary, #e8e4dc)",
            }}
          >
            {prospect.full_name}
          </div>
          {(prospect.title || prospect.company) && (
            <div
              className="font-sans truncate"
              style={{
                fontSize: "13px",
                color: "var(--text-secondary, rgba(232,228,220,0.7))",
              }}
            >
              {[prospect.title, prospect.company].filter(Boolean).join(" · ")}
              {prospect.location && (
                <span
                  style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
                >
                  {" · "}
                  {prospect.location}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Session History Clock Button */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => {
              setShowSessionHistory((v) => !v);
              if (!showSessionHistory) loadSessions();
            }}
            className="flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200"
            style={{
              color: "var(--text-tertiary, rgba(232,228,220,0.4))",
              background: "transparent",
            }}
            title="Session history"
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color =
                "var(--text-secondary, rgba(232,228,220,0.7))")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color =
                "var(--text-tertiary, rgba(232,228,220,0.4))")
            }
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Session Dropdown */}
          {showSessionHistory && (
            <div
              className="absolute right-0 top-10 z-50 w-72 rounded-lg shadow-xl py-1 overflow-y-auto"
              style={{
                background: "var(--bg-elevated, #1a1a1a)",
                border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
                maxHeight: "320px",
              }}
            >
              <button
                onClick={startNewSession}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
                style={{
                  color: "var(--gold-primary, #d4af37)",
                  borderBottom: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(212,175,55,0.08)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
                }
              >
                + New research
              </button>
              {loadingSessions ? (
                <div
                  className="px-3 py-2 text-sm"
                  style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
                >
                  Loading...
                </div>
              ) : sessions.length === 0 ? (
                <div
                  className="px-3 py-2 text-sm"
                  style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
                >
                  No sessions yet
                </div>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className="flex flex-col w-full px-3 py-2 text-left transition-colors"
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        "rgba(255,255,255,0.04)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
                    }
                  >
                    <span
                      className="text-sm truncate"
                      style={{ color: "var(--text-primary, #e8e4dc)" }}
                    >
                      {session.first_query}
                    </span>
                    <span
                      className="font-mono text-[11px] mt-0.5"
                      style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
                    >
                      {session.result_count} results ·{" "}
                      {new Date(session.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </button>
                ))
              )}
              <button
                onClick={() => setShowSessionHistory(false)}
                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded"
                style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255,255,255,0.08) transparent",
        }}
      >
        {/* Smart Suggestions (empty session) */}
        {messages.length === 0 && suggestions.length > 0 && (
          <div className="flex flex-col gap-3">
            <p
              className="font-sans text-sm"
              style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
            >
              Try asking about {prospect.first_name}:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(suggestion)}
                  className="px-3 py-1.5 rounded-full text-xs font-sans transition-all duration-150"
                  style={{
                    background: "var(--bg-card, rgba(255,255,255,0.04))",
                    border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
                    color: "var(--text-secondary, rgba(232,228,220,0.7))",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.borderColor =
                      "var(--border-gold, rgba(212,175,55,0.4))")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.borderColor =
                      "var(--border-subtle, rgba(255,255,255,0.08))")
                  }
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Messages */}
        {messages.map((msg) => (
          <div key={msg.id} className="space-y-3">
            {msg.role === "user" ? (
              /* User bubble */
              <div className="flex justify-end">
                <div
                  className="font-sans text-sm rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%]"
                  style={{
                    background: "var(--gold-bg-strong, rgba(212,175,55,0.12))",
                    border: "1px solid var(--border-gold, rgba(212,175,55,0.3))",
                    color: "var(--text-primary, #e8e4dc)",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ) : (
              /* Assistant response */
              <div className="space-y-3">
                {/* Reasoning block (if present) */}
                {msg.metadata?.reasoning && (
                  <ReasoningBlock
                    text={msg.metadata.reasoning}
                    defaultCollapsed
                  />
                )}

                {/* Content */}
                <p
                  className="font-sans text-sm"
                  style={{ color: "var(--text-secondary, rgba(232,228,220,0.7))" }}
                >
                  {msg.content}
                </p>

                {/* Result cards */}
                {msg.cards && msg.cards.length > 0 && (
                  <CardGroup
                    cards={msg.cards}
                    prospectId={prospectId}
                    messageId={msg.id}
                    lowRelevanceCollapsed={lowRelevanceCollapsed}
                    onToggleLowRelevance={() =>
                      setLowRelevanceCollapsed((v) => !v)
                    }
                  />
                )}

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (
                  <SourcesList sources={msg.sources} />
                )}
              </div>
            )}
          </div>
        ))}

        {/* Streaming indicators */}
        {isSearching && (
          <div className="space-y-3">
            {/* Reasoning streaming */}
            {streamPhase === "reasoning" && streamingReasoning && (
              <ReasoningBlock
                text={streamingReasoning}
                streaming
                defaultCollapsed={false}
              />
            )}

            {/* Tool call status */}
            {streamPhase === "tool" && toolStatus && (
              <ToolStatus status={toolStatus} />
            )}

            {/* Shimmer cards */}
            {streamPhase === "shimmer" && (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <ShimmerCard key={i} />
                ))}
              </div>
            )}

            {/* Streaming cards */}
            {(streamPhase === "cards" || streamPhase === "sources") &&
              streamingCards.map((card, idx) => (
                <ResearchResultCard
                  key={card.index}
                  card={card}
                  prospectId={prospectId}
                  messageId="streaming"
                  index={idx}
                />
              ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Prompt Input */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{
          borderTop: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
          background: "var(--bg-surface, rgba(255,255,255,0.02))",
        }}
      >
        <div
          className="flex items-end gap-2 rounded-xl px-3 py-2 transition-all duration-200"
          style={{
            background: "var(--bg-card, rgba(255,255,255,0.04))",
            border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
          }}
          onFocusCapture={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.borderColor = isSearching
              ? "var(--gold-primary, #d4af37)"
              : "var(--border-gold, rgba(212,175,55,0.4))";
            el.style.boxShadow = "0 0 0 2px rgba(212,175,55,0.15)";
          }}
          onBlurCapture={(e) => {
            const el = e.currentTarget as HTMLDivElement;
            el.style.borderColor =
              "var(--border-subtle, rgba(255,255,255,0.08))";
            el.style.boxShadow = "none";
          }}
        >
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              handleTextareaInput();
            }}
            onKeyDown={handleKeyDown}
            onInput={handleTextareaInput}
            placeholder={
              isSearching
                ? "Researching..."
                : `Ask about ${prospect.first_name}...`
            }
            disabled={isSearching}
            rows={1}
            className="flex-1 bg-transparent resize-none focus:outline-none font-sans text-sm leading-5 py-0.5"
            style={{
              color: "var(--text-primary, #e8e4dc)",
              maxHeight: "84px",
              overflowY: "auto",
            }}
          />
          <button
            onClick={() => handleSend(inputValue)}
            disabled={isSearching || !inputValue.trim()}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
            style={{
              background:
                inputValue.trim() && !isSearching
                  ? "linear-gradient(135deg, var(--gold-primary, #d4af37), #f0c04a)"
                  : "var(--bg-card, rgba(255,255,255,0.04))",
              color:
                inputValue.trim() && !isSearching
                  ? "#000"
                  : "var(--text-tertiary, rgba(232,228,220,0.4))",
            }}
          >
            <SendHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function ReasoningBlock({
  text,
  streaming = false,
  defaultCollapsed = false,
}: {
  text: string;
  streaming?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-mono text-left"
        style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
      >
        <span className="flex-1">
          {streaming ? "Reasoning..." : "Reasoning"}
        </span>
        {collapsed ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronUp className="w-3 h-3" />
        )}
      </button>
      {!collapsed && (
        <div
          className="px-3 pb-3 text-xs font-sans leading-relaxed"
          style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
        >
          {text}
          {streaming && (
            <span
              className="inline-block w-1.5 h-3 ml-0.5 align-middle animate-pulse"
              style={{ background: "var(--gold-primary, #d4af37)" }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ToolStatus({ status }: { status: string }) {
  return (
    <div
      className="flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg"
      style={{
        background: "rgba(212,175,55,0.06)",
        border: "1px solid rgba(212,175,55,0.15)",
        color: "var(--gold-primary, #d4af37)",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full animate-pulse"
        style={{ background: "var(--gold-primary, #d4af37)" }}
      />
      {status}
    </div>
  );
}

function ShimmerCard() {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: "var(--bg-card, rgba(255,255,255,0.04))",
        border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
      }}
    >
      <div
        className="h-3 w-24 rounded animate-pulse"
        style={{ background: "rgba(212,175,55,0.15)" }}
      />
      <div
        className="h-4 w-3/4 rounded animate-pulse"
        style={{ background: "rgba(255,255,255,0.06)" }}
      />
      <div className="space-y-1.5">
        <div
          className="h-3 w-full rounded animate-pulse"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />
        <div
          className="h-3 w-5/6 rounded animate-pulse"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />
        <div
          className="h-3 w-4/5 rounded animate-pulse"
          style={{ background: "rgba(255,255,255,0.04)" }}
        />
      </div>
    </div>
  );
}

function CardGroup({
  cards,
  prospectId,
  messageId,
  lowRelevanceCollapsed,
  onToggleLowRelevance,
}: {
  cards: ScrapbookCard[];
  prospectId: string;
  messageId: string;
  lowRelevanceCollapsed: boolean;
  onToggleLowRelevance: () => void;
}) {
  const primary = cards.filter(
    (c) => c.relevance !== "low" && c.answer_relevance !== "background"
  );
  const background = cards.filter(
    (c) => c.relevance === "low" || c.answer_relevance === "background"
  );

  return (
    <div className="space-y-3">
      {primary.map((card, idx) => (
        <ResearchResultCard
          key={card.index}
          card={card}
          prospectId={prospectId}
          messageId={messageId}
          index={idx}
        />
      ))}
      {background.length > 0 && (
        <div>
          {lowRelevanceCollapsed ? (
            <button
              onClick={onToggleLowRelevance}
              className="text-xs font-sans px-3 py-1.5 rounded-full transition-all duration-150"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
                color: "var(--text-tertiary, rgba(232,228,220,0.4))",
              }}
            >
              {background.length} more result{background.length !== 1 ? "s" : ""} (background) · Show
            </button>
          ) : (
            <div className="space-y-3">
              <button
                onClick={onToggleLowRelevance}
                className="text-xs font-sans px-3 py-1.5 rounded-full transition-all duration-150"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
                  color: "var(--text-tertiary, rgba(232,228,220,0.4))",
                }}
              >
                Hide background results
              </button>
              {background.map((card, idx) => (
                <div
                  key={card.index}
                  style={{
                    opacity: 0.6,
                    animation: "slideDown 200ms ease forwards",
                  }}
                >
                  <ResearchResultCard
                    card={card}
                    prospectId={prospectId}
                    messageId={messageId}
                    index={primary.length + idx}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SourcesList({
  sources,
}: {
  sources: Array<{ url: string; title: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 w-full px-3 py-2 text-xs font-mono text-left"
        style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
      >
        <span className="flex-1">{sources.length} source{sources.length !== 1 ? "s" : ""}</span>
        {expanded ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1">
          {sources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs hover:underline truncate"
              style={{ color: "var(--gold-primary, #d4af37)" }}
            >
              {s.title || s.url}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
