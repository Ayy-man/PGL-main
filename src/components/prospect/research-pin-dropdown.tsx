"use client";

import { useState, useRef, useEffect } from "react";
import { Pin, Check, X, Zap, FileText } from "lucide-react";
import type { ScrapbookCard, PinTarget } from "@/types/research";

interface ResearchPinDropdownProps {
  card: ScrapbookCard;
  prospectId: string;
  messageId: string;
  isPinned?: boolean;
  onPinSuccess?: (cardIndex: number, pinTarget: PinTarget) => void;
}

interface PinTargetOption {
  id: PinTarget;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const PIN_TARGETS: PinTargetOption[] = [
  { id: "signal", label: "Add as Wealth Signal", Icon: Zap },
  { id: "note", label: "Save as Research Note", Icon: FileText },
];

export function ResearchPinDropdown({
  card,
  prospectId,
  messageId,
  isPinned: externalIsPinned = false,
  onPinSuccess,
}: ResearchPinDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editMode, setEditMode] = useState<PinTarget | null>(null);
  const [editedHeadline, setEditedHeadline] = useState("");
  const [editedSummary, setEditedSummary] = useState("");
  const [isPinning, setIsPinning] = useState(false);
  const [isPinned, setIsPinned] = useState(externalIsPinned);
  const [showUndo, setShowUndo] = useState(false);
  const [undoTimeout, setUndoTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setEditMode(null);
      }
    };
    if (isOpen || editMode) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, editMode]);

  // Cleanup undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeout) clearTimeout(undoTimeout);
    };
  }, [undoTimeout]);

  const handleSelectTarget = (target: PinTarget) => {
    setIsOpen(false);
    setEditMode(target);
    if (target === "dossier_hook") {
      setEditedHeadline(
        `Ask about their ${card.headline.toLowerCase()}`
      );
      setEditedSummary(card.summary);
    } else {
      setEditedHeadline(card.headline);
      setEditedSummary(card.summary);
    }
  };

  const handlePin = async () => {
    if (!editMode) return;
    setIsPinning(true);

    try {
      const res = await fetch(
        `/api/prospects/${prospectId}/research/pin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            card_index: card.index,
            pin_target: editMode,
            message_id: messageId,
            edited_headline: editedHeadline,
            edited_summary: editedSummary,
            card,
          }),
        }
      );

      if (res.ok) {
        setIsPinned(true);
        setEditMode(null);
        setShowUndo(true);
        onPinSuccess?.(card.index, editMode);

        const timeout = setTimeout(() => {
          setShowUndo(false);
          setUndoTimeout(null);
        }, 5000);
        setUndoTimeout(timeout);
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("Pin failed:", data);
      }
    } catch (err) {
      console.error("Pin request failed:", err);
    } finally {
      setIsPinning(false);
    }
  };

  const handleUndo = () => {
    // MVP: reset UI state only (DB undo is future work)
    if (undoTimeout) clearTimeout(undoTimeout);
    setIsPinned(false);
    setShowUndo(false);
    setUndoTimeout(null);
  };

  const handleCancel = () => {
    setEditMode(null);
    setEditedHeadline("");
    setEditedSummary("");
  };

  // Pinned state display
  if (isPinned) {
    return (
      <div className="flex items-center gap-1">
        <span
          className="flex items-center gap-1 text-xs font-sans font-medium px-2 py-1 rounded-md"
          style={{ color: "var(--gold-primary, #d4af37)" }}
        >
          <Check className="w-3 h-3" />
          Pinned
        </span>
        {showUndo && (
          <button
            onClick={handleUndo}
            className="text-xs font-sans px-2 py-1 rounded-md transition-colors"
            style={{
              color: "var(--text-tertiary, rgba(232,228,220,0.4))",
              textDecoration: "underline",
            }}
          >
            Undo
          </button>
        )}
      </div>
    );
  }

  // Edit mode
  if (editMode) {
    const isHook = editMode === "dossier_hook";
    return (
      <div
        className="absolute left-0 z-50 w-full mt-1 rounded-lg p-3 space-y-2"
        style={{
          background: "var(--bg-elevated, #1a1a1a)",
          border: "1px solid var(--border-gold, rgba(212,175,55,0.4))",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}
        ref={dropdownRef}
      >
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-xs font-mono font-medium"
            style={{ color: "var(--gold-primary, #d4af37)" }}
          >
            {PIN_TARGETS.find((t) => t.id === editMode)?.label}
          </span>
          <button
            onClick={handleCancel}
            className="w-5 h-5 flex items-center justify-center rounded"
            style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        <input
          type="text"
          value={editedHeadline}
          onChange={(e) => setEditedHeadline(e.target.value)}
          className="w-full px-3 py-2 rounded-md text-sm font-sans focus:outline-none"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border-gold, rgba(212,175,55,0.4))",
            color: "var(--text-primary, #e8e4dc)",
          }}
          placeholder={isHook ? "Outreach hook" : "Headline"}
        />

        {!isHook && (
          <textarea
            value={editedSummary}
            onChange={(e) => setEditedSummary(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-md text-sm font-sans resize-none focus:outline-none"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
              color: "var(--text-secondary, rgba(232,228,220,0.7))",
            }}
            placeholder="Summary"
          />
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handlePin}
            disabled={isPinning || !editedHeadline.trim()}
            className="px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-150 disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, var(--gold-primary, #d4af37), #f0c04a)",
              color: "#000",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.filter =
                "brightness(1.1)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.filter = "none")
            }
          >
            {isPinning ? "Saving..." : "Save & Pin"}
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm font-sans rounded-md transition-all duration-150"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
              color: "var(--text-secondary, rgba(232,228,220,0.7))",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor = "rgba(255,255,255,0.15)";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.borderColor =
                "var(--border-subtle, rgba(255,255,255,0.08))";
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Default: Pin trigger button + dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        title="Pin to dossier"
        className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150"
        style={{
          color: "var(--text-tertiary, rgba(232,228,220,0.4))",
          background: "transparent",
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "rgba(212,175,55,0.1)";
          el.style.color = "var(--gold-primary, #d4af37)";
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "transparent";
          el.style.color = "var(--text-tertiary, rgba(232,228,220,0.4))";
        }}
      >
        <Pin className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 bottom-full mb-1 z-50 w-52 rounded-lg py-1 shadow-xl"
          style={{
            background: "#1e1e1e",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
          }}
        >
          {PIN_TARGETS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => handleSelectTarget(id)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm font-sans text-left transition-colors"
              style={{ color: "var(--text-secondary, rgba(232,228,220,0.7))" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = "rgba(255,255,255,0.04)";
                el.style.color = "var(--text-primary, #e8e4dc)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = "transparent";
                el.style.color =
                  "var(--text-secondary, rgba(232,228,220,0.7))";
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
