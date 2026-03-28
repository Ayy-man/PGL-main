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

const OUTREACH_BUTTONS: {
  key: "call" | "email" | "met" | "linkedin";
  label: string;
  icon: React.ElementType;
  eventType: EventType;
}[] = [
  { key: "call", label: "Call", icon: Phone, eventType: "call" },
  { key: "email", label: "Email", icon: Mail, eventType: "email" },
  { key: "met", label: "Met", icon: Users, eventType: "met" },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin, eventType: "linkedin" },
];

export function QuickActionBar({ prospectId, onActivityCreated }: QuickActionBarProps) {
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
  const noteInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const customTitleRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus when mode changes
  useEffect(() => {
    if (activeMode && activeMode !== "custom") {
      setTimeout(() => {
        noteInputRef.current?.focus();
      }, 50);
    }
    if (activeMode === "custom") {
      setTimeout(() => {
        customTitleRef.current?.focus();
      }, 50);
    }
  }, [activeMode]);

  // Click-outside to cancel
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleCancel();
      }
    }
    if (activeMode) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeMode]);

  function handleCancel() {
    setActiveMode(null);
    setNoteValue("");
    setCustomTitle("");
    setCustomNote("");
  }

  function handleButtonClick(mode: ActiveMode) {
    if (activeMode === mode) {
      handleCancel();
    } else {
      handleCancel();
      setActiveMode(mode);
    }
  }

  async function submitOutreach(eventType: EventType, category: ActivityCategory, title: string, note: string | null) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          eventType,
          title,
          note: note || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save activity");
      const data = await res.json();
      onActivityCreated(data.event ?? data);
      handleCancel();
    } catch (err) {
      console.error("[QuickActionBar] submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOutreachSubmit(eventType: EventType) {
    const title = EVENT_TITLES[eventType] ?? String(eventType);
    await submitOutreach(eventType, "outreach", title, noteValue.trim() || null);
  }

  async function handleNoteSubmit() {
    const trimmed = noteValue.trim();
    if (!trimmed) return;
    await submitOutreach("note_added", "team", "Note added", trimmed);
  }

  async function handleCustomSubmit() {
    if (!customTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "custom" as ActivityCategory,
          eventType: "custom" as EventType,
          title: customTitle.trim(),
          note: customNote.trim() || null,
          eventAt: customDate ? new Date(customDate).toISOString() : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save custom event");
      const data = await res.json();
      onActivityCreated(data.event ?? data);
      handleCancel();
    } catch (err) {
      console.error("[QuickActionBar] custom submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, onSubmit: () => void, isTextarea = false) {
    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    } else if (e.key === "Enter" && (!isTextarea || !e.shiftKey)) {
      e.preventDefault();
      onSubmit();
    }
  }

  const getOutreachBtn = (btn: typeof OUTREACH_BUTTONS[0]) => {
    const isActive = activeMode === btn.key;
    const Icon = btn.icon;
    return (
      <button
        key={btn.key}
        onClick={() => handleButtonClick(btn.key)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[8px] transition-all duration-150 border"
        style={{
          background: isActive ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.03)",
          borderColor: isActive ? "var(--gold-primary)" : "var(--border-default, rgba(255,255,255,0.06))",
          color: isActive ? "var(--gold-primary)" : "var(--text-secondary, rgba(232,228,220,0.7))",
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,175,55,0.3)";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.05)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default, rgba(255,255,255,0.06))";
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
          }
        }}
      >
        <Icon className="h-3.5 w-3.5" />
        {btn.label}
      </button>
    );
  };

  const isNoteActive = activeMode === "note";
  const isCustomActive = activeMode === "custom";

  const activeOutreach = OUTREACH_BUTTONS.find((b) => b.key === activeMode);

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      {/* Button row */}
      <div className="flex flex-wrap items-center gap-2">
        {OUTREACH_BUTTONS.map((btn) => getOutreachBtn(btn))}

        {/* Add Note */}
        <button
          onClick={() => handleButtonClick("note")}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[8px] transition-all duration-150 border"
          style={{
            background: isNoteActive ? "rgba(212,175,55,0.1)" : "rgba(255,255,255,0.03)",
            borderColor: isNoteActive ? "var(--gold-primary)" : "var(--border-default, rgba(255,255,255,0.06))",
            color: isNoteActive ? "var(--gold-primary)" : "var(--text-secondary, rgba(232,228,220,0.7))",
          }}
          onMouseEnter={(e) => {
            if (!isNoteActive) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,175,55,0.3)";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,175,55,0.05)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isNoteActive) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default, rgba(255,255,255,0.06))";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
            }
          }}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Add Note
        </button>

        {/* Custom Event */}
        <button
          onClick={() => handleButtonClick("custom")}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[8px] transition-all duration-150 border"
          style={{
            background: isCustomActive ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.03)",
            borderColor: isCustomActive ? "var(--purple, #a855f7)" : "var(--border-default, rgba(255,255,255,0.06))",
            color: isCustomActive ? "var(--purple, #a855f7)" : "var(--text-secondary, rgba(232,228,220,0.7))",
          }}
          onMouseEnter={(e) => {
            if (!isCustomActive) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(168,85,247,0.3)";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(168,85,247,0.05)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isCustomActive) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-default, rgba(255,255,255,0.06))";
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.03)";
            }
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Custom Event
        </button>
      </div>

      {/* Inline input area - outreach buttons (single input) */}
      <div
        style={{
          maxHeight: activeOutreach ? "100px" : "0px",
          overflow: "hidden",
          transition: "max-height 200ms ease-out",
        }}
      >
        {activeOutreach && (
          <div className="flex items-center gap-2 pt-1">
            <input
              ref={noteInputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, () => handleOutreachSubmit(activeOutreach.eventType))}
              placeholder="Add a note (optional)..."
              disabled={isSubmitting}
              className="flex-1 px-3 py-1.5 text-xs rounded-[6px] border outline-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "var(--border-default, rgba(255,255,255,0.06))",
                color: "var(--text-foreground, rgba(232,228,220,0.9))",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(212,175,55,0.4)";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(212,175,55,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default, rgba(255,255,255,0.06))";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <button
              onClick={() => handleOutreachSubmit(activeOutreach.eventType)}
              disabled={isSubmitting}
              className="flex items-center justify-center w-7 h-7 rounded-[6px] border transition-all duration-150 flex-shrink-0"
              style={{
                background: "rgba(212,175,55,0.1)",
                borderColor: "var(--gold-primary)",
                color: "var(--gold-primary)",
              }}
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex items-center justify-center w-7 h-7 rounded-[6px] border transition-all duration-150 flex-shrink-0"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "var(--border-default, rgba(255,255,255,0.06))",
                color: "var(--text-secondary, rgba(232,228,220,0.5))",
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Inline input area - Add Note (textarea) */}
      <div
        style={{
          maxHeight: isNoteActive ? "140px" : "0px",
          overflow: "hidden",
          transition: "max-height 200ms ease-out",
        }}
      >
        {isNoteActive && (
          <div className="flex flex-col gap-2 pt-1">
            <textarea
              ref={noteInputRef as React.RefObject<HTMLTextAreaElement>}
              rows={3}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleNoteSubmit, true)}
              placeholder="Write a note..."
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-xs rounded-[6px] border outline-none resize-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "var(--border-default, rgba(255,255,255,0.06))",
                color: "var(--text-foreground, rgba(232,228,220,0.9))",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(212,175,55,0.4)";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(212,175,55,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default, rgba(255,255,255,0.06))";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-3 py-1 text-xs rounded-[6px] border transition-all duration-150"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "var(--border-default, rgba(255,255,255,0.06))",
                  color: "var(--text-secondary, rgba(232,228,220,0.5))",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleNoteSubmit}
                disabled={isSubmitting || !noteValue.trim()}
                className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-[6px] border transition-all duration-150"
                style={{
                  background: "rgba(212,175,55,0.1)",
                  borderColor: "var(--gold-primary)",
                  color: "var(--gold-primary)",
                  opacity: !noteValue.trim() ? 0.5 : 1,
                }}
              >
                {isSubmitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
                Save Note
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inline form - Custom Event */}
      <div
        style={{
          maxHeight: isCustomActive ? "260px" : "0px",
          overflow: "hidden",
          transition: "max-height 200ms ease-out",
        }}
      >
        {isCustomActive && (
          <div className="flex flex-col gap-2 pt-1">
            <input
              ref={customTitleRef}
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Event title *"
              disabled={isSubmitting}
              className="w-full px-3 py-1.5 text-xs rounded-[6px] border outline-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "var(--border-default, rgba(255,255,255,0.06))",
                color: "var(--text-foreground, rgba(232,228,220,0.9))",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(168,85,247,0.4)";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(168,85,247,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default, rgba(255,255,255,0.06))";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <input
              type="datetime-local"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3 py-1.5 text-xs rounded-[6px] border outline-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "var(--border-default, rgba(255,255,255,0.06))",
                color: "var(--text-foreground, rgba(232,228,220,0.9))",
                colorScheme: "dark",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(168,85,247,0.4)";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(168,85,247,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default, rgba(255,255,255,0.06))";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Details (optional)"
              disabled={isSubmitting}
              className="w-full px-3 py-2 text-xs rounded-[6px] border outline-none resize-none"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "var(--border-default, rgba(255,255,255,0.06))",
                color: "var(--text-foreground, rgba(232,228,220,0.9))",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(168,85,247,0.4)";
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(168,85,247,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border-default, rgba(255,255,255,0.06))";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                className="px-3 py-1 text-xs rounded-[6px] border transition-all duration-150"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  borderColor: "var(--border-default, rgba(255,255,255,0.06))",
                  color: "var(--text-secondary, rgba(232,228,220,0.5))",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCustomSubmit}
                disabled={isSubmitting || !customTitle.trim()}
                className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-[6px] border transition-all duration-150"
                style={{
                  background: "rgba(168,85,247,0.15)",
                  borderColor: "var(--purple, #a855f7)",
                  color: "var(--purple, #a855f7)",
                  opacity: !customTitle.trim() ? 0.5 : 1,
                }}
              >
                {isSubmitting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                Log Event
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
