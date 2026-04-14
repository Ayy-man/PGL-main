"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, SendHorizontal, ChevronDown, ChevronUp, Globe, Loader2, CheckCircle2, SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
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
  pinnedCardIndices?: Set<number>;
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
  return crypto.randomUUID();
}

const _STREAMING_LABELS: Partial<Record<StreamPhase, string>> = {
  reasoning: "Thinking about your question...",
  tool: "Searching the web...",
  shimmer: "Analyzing results...",
  cards: "Building intelligence cards...",
  sources: "Collecting sources...",
};

export function ResearchPanel({ prospectId, prospect, orgId: _orgId }: ResearchPanelProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [streamPhase, setStreamPhase] = useState<StreamPhase>("idle");
  const [_currentCards, setCurrentCards] = useState<ScrapbookCard[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [_streamingReasoning, setStreamingReasoning] = useState<string>("");
  const [_reasoningCollapsed, setReasoningCollapsed] = useState(false);
  const [toolStatus, setToolStatus] = useState<string>("");
  const [_exaResultCount, setExaResultCount] = useState<number | null>(null);
  const [lowRelevanceCollapsed, setLowRelevanceCollapsed] = useState(true);
  const [streamingCards, setStreamingCards] = useState<ScrapbookCard[]>([]);
  const [reformulatedQuery, setReformulatedQuery] = useState<string>("");
  const [noDirectResultsMsg, setNoDirectResultsMsg] = useState<string>("");
  const [searchExpanded, setSearchExpanded] = useState(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentMessageIdRef = useRef<string | null>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingCards, streamPhase]);

  // Prefetch sessions on mount so dropdown opens instantly
  useEffect(() => {
    loadSessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch(`/api/prospects/${prospectId}/research/suggestions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ count: 4 }),
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
  }, [prospectId, messages.length]);

  // Replace a single used suggestion with a fresh one (saves LLM cost vs regenerating all 4)
  const replaceSuggestion = useCallback(async (usedIndex: number, usedText: string) => {
    // Mark as loading with a placeholder
    setSuggestions((prev) => {
      const next = [...prev];
      next[usedIndex] = "...";
      return next;
    });

    try {
      const res = await fetch(`/api/prospects/${prospectId}/research/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: 1,
          exclude: [...suggestions.filter((_, i) => i !== usedIndex), usedText],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const newSuggestion = data.suggestions?.[0];
        if (newSuggestion) {
          setSuggestions((prev) => {
            const next = [...prev];
            next[usedIndex] = newSuggestion;
            return next;
          });
          return;
        }
      }
    } catch {
      // Silent fail
    }

    // If replacement failed, just remove the slot
    setSuggestions((prev) => prev.filter((_, i) => i !== usedIndex));
  }, [prospectId, suggestions]);

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
      setReformulatedQuery("");
      setSearchExpanded(true);
      setStreamingReasoning("");
      setReasoningCollapsed(false);
      setToolStatus("");
      setExaResultCount(null);
      setStreamingCards([]);
      setNoDirectResultsMsg("");
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
        let _newSessionId = sessionId;
        const reasoningText = "";
        const assistantContent = "";

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

              // Vercel AI SDK wraps custom types as "data-*"
              // event.data contains the actual payload
              const eventData = event.data ?? event;

              if (type === "data-session") {
                _newSessionId = eventData.session_id;
                setSessionId(eventData.session_id);
              } else if (type === "data-message-id") {
                currentMessageIdRef.current = eventData.message_id;
              } else if (type === "data-reasoning") {
                if (eventData.status === "complete" && eventData.reformulated) {
                  setReformulatedQuery(eventData.reformulated);
                } else if (eventData.status === "no_direct_results" && eventData.message) {
                  setNoDirectResultsMsg(eventData.message);
                }
                setStreamPhase("reasoning");
              } else if (type === "data-tool") {
                setStreamPhase("tool");
                if (eventData.status === "completed" && typeof eventData.count === "number") {
                  setExaResultCount(eventData.count);
                  setToolStatus(`${eventData.count} results`);
                } else {
                  setToolStatus("Searching...");
                }
              } else if (type === "data-shimmer") {
                setStreamPhase("shimmer");
                setReasoningCollapsed(true);
              } else if (type === "data-card") {
                const card: ScrapbookCard = eventData as ScrapbookCard;
                cards.push(card);
                setStreamingCards((prev) => [...prev, card]);
                setStreamPhase("cards");
              } else if (type === "data-sources") {
                const urls: string[] = eventData.urls ?? [];
                for (const url of urls) {
                  sources.push({ url, title: url });
                }
                setStreamPhase("sources");
              } else if (type === "data-complete") {
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
            : "No results found. Try rephrasing your question, or ask about a different aspect of " + prospect.first_name + "'s background.");

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
        setSearchExpanded(false);
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
        setSessions(Array.isArray(data) ? data : data.sessions ?? []);
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
      const pins: Array<{ message_id: string; card_index: number }> = data.pins ?? [];
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
          pinnedCardIndices: new Set(
            pins.filter((p) => p.message_id === m.id).map((p) => p.card_index)
          ),
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
  const _getCardGroups = (cards: ScrapbookCard[]) => {
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
      className="surface-card rounded-[14px] flex flex-col flex-1 h-full overflow-hidden"
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
        <div className="flex-shrink-0">
          <button
            onClick={() => {
              setShowSessionHistory((v) => !v);
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

        </div>
      </div>

      {/* Inline Session History */}
      {showSessionHistory && (
        <div
          className="flex-shrink-0 overflow-y-auto"
          style={{
            background: "#1a1a1a",
            borderBottom: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
            maxHeight: "220px",
          }}
        >
          <button
            onClick={startNewSession}
            className="flex items-center gap-1.5 w-full px-4 py-2 text-sm font-medium transition-colors"
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
            + New
          </button>
          {loadingSessions ? (
            <div
              className="px-4 py-2.5 text-sm"
              style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
            >
              Loading...
            </div>
          ) : sessions.length === 0 ? (
            <div
              className="px-4 py-2.5 text-sm"
              style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
            >
              No sessions yet
            </div>
          ) : (
            sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => loadSession(session.id)}
                className="flex items-center gap-2 w-full px-4 py-2 text-left transition-colors"
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.04)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = "transparent")
                }
              >
                <span
                  className="text-sm truncate flex-1"
                  style={{ color: "var(--text-primary, #e8e4dc)" }}
                >
                  {session.first_query}
                </span>
                <span
                  className="font-mono text-[11px] shrink-0"
                  style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
                >
                  {new Date(session.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </button>
            ))
          )}
        </div>
      )}

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
                  key={`${i}-${suggestion}`}
                  onClick={() => {
                    handleSend(suggestion);
                    replaceSuggestion(i, suggestion);
                  }}
                  disabled={suggestion === "..."}
                  className="px-3 py-1.5 rounded-full text-xs font-sans transition-all duration-150 disabled:opacity-40"
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

        {/* Empty state: no messages, no suggestions, not searching */}
        {messages.length === 0 && suggestions.length === 0 && !isSearching && (
          <EmptyState
            icon={SearchX}
            title={`Research ${prospect.first_name}`}
            description="Ask about their career, investments, recent news, SEC filings, or company activities."
          />
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
                    pinnedCardIndices={msg.pinnedCardIndices}
                    onNotePinned={() => router.refresh()}
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

        {/* Streaming indicators — Claude-style search visualization */}
        {isSearching && (
          <div className="space-y-3">
            {/* "Searched the web" collapsible section */}
            <div className="space-y-2">
              {/* Header — clickable to expand/collapse */}
              <button
                type="button"
                onClick={() => setSearchExpanded((v) => !v)}
                className="flex items-center gap-2 text-left w-full cursor-pointer group"
              >
                {streamPhase === "complete" || streamPhase === "cards" || streamPhase === "sources" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--gold-primary)" }} />
                ) : (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" style={{ color: "var(--gold-primary)" }} />
                )}
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary, rgba(232,228,220,0.7))" }}
                >
                  {streamPhase === "reasoning" ? "Thinking..." :
                   streamPhase === "tool" ? "Searching the web" :
                   streamPhase === "shimmer" ? "Analyzing results" :
                   streamPhase === "cards" || streamPhase === "sources" || streamPhase === "complete" ? "Searched the web" :
                   "Searching..."}
                </span>
                {searchExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-40" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
                )}
              </button>

              {/* Expanded: show search query + results list */}
              {searchExpanded && (
                <div
                  className="ml-6 rounded-lg overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-default, rgba(255,255,255,0.06))",
                  }}
                >
                  {/* Search query row */}
                  {(reformulatedQuery || streamPhase !== "reasoning") && (
                    <div
                      className="flex items-center gap-2 px-3 py-2"
                      style={{ borderBottom: "1px solid var(--border-default, rgba(255,255,255,0.06))" }}
                    >
                      <Globe className="h-3.5 w-3.5 shrink-0 opacity-40" />
                      <span className="text-xs truncate" style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}>
                        {reformulatedQuery || "Searching..."}
                      </span>
                      {toolStatus && (
                        <span className="text-[10px] shrink-0 ml-auto" style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}>
                          {toolStatus}
                        </span>
                      )}
                    </div>
                  )}

                  {/* No direct results quality signal */}
                  {noDirectResultsMsg && (
                    <div
                      className="text-xs px-3 py-2 rounded-md mb-2"
                      style={{
                        backgroundColor: "rgba(234, 179, 8, 0.08)",
                        color: "var(--text-secondary, rgba(232,228,220,0.6))",
                        border: "1px solid rgba(234, 179, 8, 0.15)",
                      }}
                    >
                      {noDirectResultsMsg}
                    </div>
                  )}

                  {/* Results list — show cards as they stream in */}
                  {streamingCards.length > 0 && (
                    <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      {streamingCards.slice(0, 8).map((card) => (
                        <div key={card.index} className="flex items-center gap-2.5 px-3 py-2">
                          {card.source_favicon ? (
                            <img
                              src={card.source_favicon}
                              alt=""
                              className="h-4 w-4 rounded shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          ) : (
                            <Globe className="h-3.5 w-3.5 shrink-0 opacity-30" />
                          )}
                          <span className="text-xs truncate flex-1" style={{ color: "var(--text-primary, #e8e4dc)" }}>
                            {card.headline}
                          </span>
                          <span className="text-[10px] shrink-0 truncate max-w-[120px]" style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}>
                            {(() => { try { return new URL(card.source_url).hostname.replace("www.", ""); } catch { return card.source_name; } })()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Loading shimmer rows when no cards yet */}
                  {streamingCards.length === 0 && streamPhase !== "reasoning" && (
                    <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-2.5 px-3 py-2.5">
                          <div className="h-4 w-4 rounded bg-white/5 animate-pulse shrink-0" />
                          <div className="h-3 rounded bg-white/5 animate-pulse flex-1" style={{ maxWidth: `${60 + i * 10}%` }} />
                          <div className="h-2.5 w-16 rounded bg-white/5 animate-pulse shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Status line */}
            {streamPhase === "shimmer" && (
              <div className="flex items-center gap-2 ml-6">
                <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--gold-primary)" }} />
                <span className="text-xs" style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}>
                  Analyzing and building intelligence cards...
                </span>
              </div>
            )}
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
          className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all duration-200"
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

function _ToolStatus({ status }: { status: string }) {
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

function _ShimmerCard() {
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
  pinnedCardIndices,
  onNotePinned,
}: {
  cards: ScrapbookCard[];
  prospectId: string;
  messageId: string;
  lowRelevanceCollapsed: boolean;
  onToggleLowRelevance: () => void;
  pinnedCardIndices?: Set<number>;
  onNotePinned?: () => void;
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
          initialPinned={pinnedCardIndices?.has(card.index)}
          onNotePinned={onNotePinned}
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
                    initialPinned={pinnedCardIndices?.has(card.index)}
                    onNotePinned={onNotePinned}
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
