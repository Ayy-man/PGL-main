"use client";

import { useEffect, useState } from "react";
import { type LucideIcon, Zap, TrendingUp, AlertCircle, Users } from "lucide-react";

interface StreamEvent {
  id: number;
  type: "new_match" | "enrichment" | "lookalike" | "high_value";
  label: string;
  persona: string;
  name: string;
  detail: string;
  time: string;
}

const MOCK_EVENTS: Omit<StreamEvent, "id" | "time">[] = [
  { type: "new_match", label: "New Match", persona: "Finance Elite", name: "Jonathan S.", detail: "Director, Goldman Sachs" },
  { type: "enrichment", label: "Enrichment", persona: "Soho Crypto Founders", name: "Sarah K.", detail: "Contact details updated" },
  { type: "new_match", label: "New Match", persona: "Tech Execs", name: "Michael C.", detail: "VP Engineering, Stripe" },
  { type: "lookalike", label: "Lookalike", persona: "BigLaw Partners", name: "David R.", detail: "Managing Partner, Cravath" },
  { type: "high_value", label: "High Value", persona: "NYC Crypto Founders", name: "Elena V.", detail: "Net worth est. $320M" },
  { type: "enrichment", label: "Enrichment", persona: "Startup Founders", name: "Alex T.", detail: "SEC filing detected" },
  { type: "new_match", label: "New Match", persona: "Finance Elite", name: "Robert M.", detail: "CFO, BlackRock" },
  { type: "high_value", label: "High Value", persona: "Tech Execs", name: "Lisa W.", detail: "Recent $50M property purchase" },
];

const EVENT_STYLES: Record<StreamEvent["type"], { icon: LucideIcon; color: string; bg: string }> = {
  new_match: { icon: Users, color: "var(--gold-primary)", bg: "var(--gold-bg)" },
  enrichment: { icon: Zap, color: "var(--success)", bg: "rgba(34,197,94,0.08)" },
  lookalike: { icon: TrendingUp, color: "var(--gold-bright)", bg: "rgba(240,208,96,0.08)" },
  high_value: { icon: AlertCircle, color: "var(--gold-primary)", bg: "var(--gold-bg-strong)" },
};

function createInitialEvents(): StreamEvent[] {
  return MOCK_EVENTS.slice(0, 5).map((e, i) => ({
    ...e,
    id: Date.now() + i,
    time: `${i + 1}m ago`,
  }));
}

export function LiveDataStream() {
  const [events, setEvents] = useState<StreamEvent[]>(createInitialEvents);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * MOCK_EVENTS.length);
      const mockEvent = MOCK_EVENTS[randomIndex];
      const newEvent: StreamEvent = {
        ...mockEvent,
        id: Date.now(),
        time: "just now",
      };
      setEvents((prev) => [newEvent, ...prev].slice(0, 8));
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <aside
      className="hidden lg:flex flex-col gap-0 overflow-hidden"
      style={{
        background: "var(--bg-card-gradient)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "14px",
      }}
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-2"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div
          className="h-2 w-2 rounded-full animate-pulse"
          style={{ background: "var(--gold-primary)" }}
        />
        <span
          className="text-[13px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Live Data Stream
        </span>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto">
        {events.map((event) => {
          const eventStyle = EVENT_STYLES[event.type];
          const EventIcon = eventStyle.icon;
          const isHovered = hoveredId === event.id;

          return (
            <div
              key={event.id}
              className="px-5 py-3.5 flex gap-3 transition-colors"
              style={{
                borderBottom: "1px solid var(--border-subtle)",
                background: isHovered ? "rgba(255,255,255,0.02)" : "transparent",
              }}
              onMouseEnter={() => setHoveredId(event.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Icon circle */}
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: eventStyle.bg }}
              >
                <EventIcon
                  className="h-3.5 w-3.5"
                  style={{ color: eventStyle.color }}
                />
              </div>

              {/* Info block */}
              <div className="flex flex-col min-w-0">
                {/* Row 1: name + time */}
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[13px] font-medium truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {event.name}
                  </span>
                  <span
                    className="text-[11px] shrink-0"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {event.time}
                  </span>
                </div>

                {/* Row 2: detail */}
                <span
                  className="text-[12px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {event.detail}
                </span>

                {/* Row 3: event type pill */}
                <span
                  className="inline-flex items-center mt-1 text-[10px] font-semibold uppercase tracking-[0.5px] px-2 py-0.5 rounded-full w-fit"
                  style={{
                    background: eventStyle.bg,
                    color: eventStyle.color,
                  }}
                >
                  {event.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
