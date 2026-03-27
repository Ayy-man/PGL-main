"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, Check, X } from "lucide-react";

interface InlineEditFieldProps {
  value: string | null;
  originalValue?: string | null; // enriched value, shown in tooltip when overridden
  onSave: (newValue: string | null) => Promise<void>;
  placeholder?: string;
  displayClassName?: string;
  isEditable?: boolean; // gated by RBAC canEdit
  label?: string; // for aria-label
  isOverridden?: boolean; // shows "edited" indicator
  type?: "text" | "email" | "url" | "tel";
}

type EditState = "idle" | "editing" | "saving";

export function InlineEditField({
  value,
  originalValue,
  onSave,
  placeholder = "—",
  displayClassName,
  isEditable = false,
  label,
  isOverridden = false,
  type = "text",
}: InlineEditFieldProps) {
  const [editState, setEditState] = useState<EditState>("idle");
  const [inputValue, setInputValue] = useState<string>(value ?? "");
  const [displayValue, setDisplayValue] = useState<string | null>(value);
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display value when prop changes externally
  useEffect(() => {
    if (editState === "idle") {
      setDisplayValue(value);
      setInputValue(value ?? "");
    }
  }, [value, editState]);

  // Auto-focus input when entering edit mode
  useEffect(() => {
    if (editState === "editing" && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editState]);

  const enterEditing = useCallback(() => {
    if (!isEditable) return;
    setInputValue(displayValue ?? "");
    setEditState("editing");
  }, [isEditable, displayValue]);

  const handleSave = useCallback(async () => {
    const newValue = inputValue.trim() === "" ? null : inputValue.trim();
    const previousValue = displayValue;

    // Optimistic update
    setDisplayValue(newValue);
    setEditState("saving");

    try {
      await onSave(newValue);
      setEditState("idle");
      // Gold flash on success
      setFlash(true);
      setTimeout(() => setFlash(false), 500);
    } catch {
      // Revert on error, go back to editing
      setDisplayValue(previousValue);
      setInputValue(previousValue ?? "");
      setEditState("editing");
    }
  }, [inputValue, displayValue, onSave]);

  const handleCancel = useCallback(() => {
    setInputValue(displayValue ?? "");
    setEditState("idle");
  }, [displayValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  if (!isEditable) {
    // Read-only mode
    return (
      <span
        className={displayClassName}
        style={{ color: displayValue ? undefined : "var(--text-muted, #6b7280)" }}
      >
        {displayValue ?? placeholder}
      </span>
    );
  }

  if (editState === "editing" || editState === "saving") {
    return (
      <span className="relative inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type={type}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={editState === "saving"}
          aria-label={label}
          className={[
            "rounded border px-2 py-0.5 text-sm bg-transparent transition-all duration-200",
            "border-[var(--border-default)] focus:outline-none focus:ring-1 focus:ring-[var(--gold-primary)]",
            displayClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={editState === "saving"}
          className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Save"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={editState === "saving"}
          className="inline-flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </span>
    );
  }

  // Idle mode with pencil on hover
  return (
    <span
      className={["group relative inline-flex items-center gap-1", flash ? "ring-1 ring-[var(--gold-primary)] transition-all duration-500 rounded px-1" : ""].filter(Boolean).join(" ")}
    >
      <span
        className={displayClassName}
        onDoubleClick={enterEditing}
        title={isOverridden && originalValue ? `Original: ${originalValue}` : undefined}
        style={{ color: displayValue ? undefined : "var(--text-muted, #6b7280)" }}
      >
        {displayValue ?? placeholder}
      </span>
      {isOverridden && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
          title={originalValue ? `Original: ${originalValue}` : "Manually edited"}
        />
      )}
      <button
        type="button"
        onClick={enterEditing}
        className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center w-4 h-4 cursor-pointer text-muted-foreground hover:text-foreground"
        aria-label={`Edit ${label ?? "field"}`}
      >
        <Pencil className="w-4 h-4" />
      </button>
    </span>
  );
}
