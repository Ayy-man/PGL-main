"use client";

import { useState, useRef, useEffect } from "react";
import {
  Phone,
  Mail,
  Users,
  Linkedin,
  MessageSquare,
  Plus,
  Check,
  X,
  Loader2,
} from "lucide-react";
import {
  ProspectActivity,
  ActivityCategory,
  EventType,
  EVENT_TITLES,
} from "@/types/activity";

interface QuickActionBarProps {
  prospectId: string;
  onActivityCreated: (event: ProspectActivity) => void;
}

type ActiveMode =
  | "call"
  | "email"
  | "met"
  | "linkedin"
  | "note"
  | "custom"
  | null;

const MENU_ITEMS: {
  key: ActiveMode & string;
  label: string;
  icon: React.ElementType;
  category: ActivityCategory;
  eventType: EventType;
  color: string;
}[] = [
  { key: "call", label: "Logged a call", icon: Phone, category: "outreach", eventType: "call", color: "var(--gold-primary)" },
  { key: "email", label: "Sent email", icon: Mail, category: "outreach", eventType: "email", color: "var(--gold-primary)" },
  { key: "met", label: "Met in person", icon: Users, category: "outreach", eventType: "met", color: "var(--gold-primary)" },
  { key: "linkedin", label: "LinkedIn message", icon: Linkedin, category: "outreach", eventType: "linkedin", color: "var(--gold-primary)" },
  { key: "note", label: "Add note", icon: MessageSquare, category: "team", eventType: "note_added", color: "var(--text-secondary)" },
  { key: "custom", label: "Custom event", icon: Plus, category: "custom", eventType: "custom", color: "#a855f7" },
];

export function QuickActionBar({ prospectId, onActivityCreated }: QuickActionBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<ActiveMode>(null);
  const [noteValue, setNoteValue] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customDate, setCustomDate] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [customNote, setCustomNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeMode) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [activeMode]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    }
    if (menuOpen || activeMode) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen, activeMode]);

  function handleCancel() {
    setMenuOpen(false);
    setActiveMode(null);
    setNoteValue("");
    setCustomTitle("");
    setCustomNote("");
  }

  function selectItem(key: ActiveMode) {
    setMenuOpen(false);
    setActiveMode(key);
  }

  async function submit(category: ActivityCategory, eventType: EventType, title: string, note: string | null, eventAt?: string) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, eventType, title, note: note || null, ...(eventAt ? { eventAt } : {}) }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      onActivityCreated(data.event ?? data);
      handleCancel();
    } catch (err) {
      console.error("[QuickActionBar]", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, onSubmit: () => void, isTextarea = false) {
    if (e.key === "Escape") { e.preventDefault(); handleCancel(); }
    else if (e.key === "Enter" && (!isTextarea || !e.shiftKey)) { e.preventDefault(); onSubmit(); }
  }

  const activeItem = MENU_ITEMS.find((m) => m.key === activeMode);
  const isOutreach = activeMode && ["call", "email", "met", "linkedin"].includes(activeMode);
  const isNote = activeMode === "note";
  const isCustom = activeMode === "custom";

  return (
    <div ref={containerRef} className="relative">
      {/* Compact Log trigger — or active mode label */}
      {!activeMode ? (
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer"
          style={{ color: "var(--gold-primary)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
        >
          <Plus className="h-3.5 w-3.5" />
          Log
        </button>
      ) : (
        <div className="flex items-center gap-2 text-xs" style={{ color: activeItem?.color }}>
          {activeItem && <activeItem.icon className="h-3.5 w-3.5" />}
          <span className="font-medium">{activeItem?.label}</span>
        </div>
      )}

      {/* Dropdown menu */}
      {menuOpen && !activeMode && (
        <div
          className="absolute top-full right-0 mt-1 z-50 rounded-[10px] py-1 min-w-[180px]"
          style={{
            background: "#1a1a1a",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => selectItem(item.key as ActiveMode)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors cursor-pointer"
                style={{ color: "var(--text-secondary, rgba(232,228,220,0.7))" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLButtonElement).style.color = item.color;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary, rgba(232,228,220,0.7))";
                }}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Outreach inline input */}
      {isOutreach && activeItem && (
        <div className="flex items-center gap-2 mt-2">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, () => submit(activeItem.category, activeItem.eventType, EVENT_TITLES[activeItem.eventType] ?? activeItem.label, noteValue.trim() || null))}
            placeholder="Add a note (optional)..."
            disabled={isSubmitting}
            className="flex-1 px-3 py-1.5 text-xs rounded-[6px] border outline-none"
            style={{
              background: "rgba(255,255,255,0.03)",
              borderColor: "var(--border-default, rgba(255,255,255,0.06))",
              color: "var(--text-foreground, rgba(232,228,220,0.9))",
            }}
          />
          <button
            onClick={() => submit(activeItem.category, activeItem.eventType, EVENT_TITLES[activeItem.eventType] ?? activeItem.label, noteValue.trim() || null)}
            disabled={isSubmitting}
            className="flex items-center justify-center w-7 h-7 rounded-[6px] border shrink-0"
            style={{ background: "rgba(212,175,55,0.1)", borderColor: "var(--gold-primary)", color: "var(--gold-primary)" }}
          >
            {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
          <button onClick={handleCancel} className="flex items-center justify-center w-7 h-7 rounded-[6px] border shrink-0" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Note textarea */}
      {isNote && (
        <div className="flex flex-col gap-2 mt-2">
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            rows={3}
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, () => submit("team", "note_added", "Note added", noteValue.trim()), true)}
            placeholder="Write a note..."
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-xs rounded-[6px] border outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-default)", color: "var(--text-foreground)" }}
          />
          <div className="flex justify-end gap-2">
            <button onClick={handleCancel} className="px-3 py-1 text-xs rounded-[6px] border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>Cancel</button>
            <button onClick={() => submit("team", "note_added", "Note added", noteValue.trim())} disabled={isSubmitting || !noteValue.trim()} className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-[6px] border" style={{ background: "rgba(212,175,55,0.1)", borderColor: "var(--gold-primary)", color: "var(--gold-primary)", opacity: !noteValue.trim() ? 0.5 : 1 }}>
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* Custom event form */}
      {isCustom && (
        <div className="flex flex-col gap-2 mt-2">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder="Event title *"
            disabled={isSubmitting}
            className="w-full px-3 py-1.5 text-xs rounded-[6px] border outline-none"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-default)", color: "var(--text-foreground)" }}
          />
          <input
            type="datetime-local"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-3 py-1.5 text-xs rounded-[6px] border outline-none"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-default)", color: "var(--text-foreground)", colorScheme: "dark" }}
          />
          <textarea
            rows={2}
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="Details (optional)"
            disabled={isSubmitting}
            className="w-full px-3 py-2 text-xs rounded-[6px] border outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-default)", color: "var(--text-foreground)" }}
          />
          <div className="flex justify-end gap-2">
            <button onClick={handleCancel} className="px-3 py-1 text-xs rounded-[6px] border" style={{ background: "rgba(255,255,255,0.03)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>Cancel</button>
            <button onClick={() => submit("custom", "custom", customTitle.trim(), customNote.trim() || null, new Date(customDate).toISOString())} disabled={isSubmitting || !customTitle.trim()} className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-[6px] border" style={{ background: "rgba(168,85,247,0.15)", borderColor: "#a855f7", color: "#a855f7", opacity: !customTitle.trim() ? 0.5 : 1 }}>
              {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Log Event
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
