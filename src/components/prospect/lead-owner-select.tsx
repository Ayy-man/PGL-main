"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, X, User } from "lucide-react";

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
}

interface LeadOwnerSelectProps {
  currentOwnerId: string | null;
  teamMembers: TeamMember[];
  isEditable?: boolean; // RBAC gate
  onOwnerChange: (ownerId: string | null) => Promise<void>;
}

function getMemberInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? "?";
}

export function LeadOwnerSelect({
  currentOwnerId,
  teamMembers,
  isEditable = false,
  onOwnerChange,
}: LeadOwnerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [optimisticOwnerId, setOptimisticOwnerId] = useState(currentOwnerId);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync with prop when server state arrives
  useEffect(() => {
    setOptimisticOwnerId(currentOwnerId);
  }, [currentOwnerId]);

  const currentOwner = teamMembers.find((m) => m.id === optimisticOwnerId) ?? null;

  const handleOpen = useCallback(() => {
    if (!isEditable || isSaving) return;
    setIsOpen(true);
  }, [isEditable, isSaving]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSelect = useCallback(
    async (ownerId: string | null) => {
      const previousOwnerId = optimisticOwnerId;
      setOptimisticOwnerId(ownerId); // Optimistic
      setIsOpen(false);
      setIsSaving(true);
      try {
        await onOwnerChange(ownerId);
      } catch (err) {
        setOptimisticOwnerId(previousOwnerId); // Rollback
        console.error("[LeadOwnerSelect] Failed to update owner:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [onOwnerChange, optimisticOwnerId]
  );

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        handleClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, handleClose]);

  if (!isEditable) {
    // Read-only mode
    return (
      <span className="inline-flex items-center gap-1.5 text-sm">
        <User className="w-4 h-4 text-muted-foreground" />
        {currentOwner ? (
          <span>{currentOwner.full_name}</span>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )}
      </span>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Display row with pencil on hover */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={isSaving}
        className="group inline-flex items-center gap-1.5 text-sm cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50"
        aria-label="Change lead owner"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <User className="w-4 h-4 text-muted-foreground" />
        {currentOwner ? (
          <span>{currentOwner.full_name}</span>
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        )}
        <Pencil className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select lead owner"
          className="absolute left-0 top-full mt-1 min-w-[220px] rounded-lg z-50 border overflow-hidden"
          style={{
            backgroundColor: "#1a1a1a",
            borderColor: "var(--border-gold, rgba(var(--gold-primary-rgb), 0.3))",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {/* Unassigned option */}
          <button
            type="button"
            role="option"
            aria-selected={optimisticOwnerId === null}
            onClick={() => handleSelect(null)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left hover:bg-white/5 text-muted-foreground"
          >
            <span
              className="inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0 bg-white/[0.08] text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </span>
            <span>Unassigned</span>
          </button>

          {/* Divider */}
          <div
            className="h-px mx-2"
            style={{ backgroundColor: "var(--border-default)" }}
          />

          {/* Team members */}
          {teamMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              role="option"
              aria-selected={member.id === optimisticOwnerId}
              onClick={() => handleSelect(member.id)}
              className={[
                "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left hover:bg-white/5",
                member.id === optimisticOwnerId ? "bg-white/5" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {/* Initials circle */}
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0"
                style={{
                  background: `linear-gradient(135deg, hsl(${
                    member.full_name
                      .split("")
                      .reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
                  }, 30%, 25%), hsl(${
                    member.full_name
                      .split("")
                      .reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
                  }, 20%, 15%))`,
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary-ds, #e8e4dc)",
                }}
              >
                {getMemberInitial(member.full_name)}
              </span>
              <span className="flex flex-col min-w-0">
                <span className="truncate font-medium text-foreground">
                  {member.full_name}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {member.email}
                </span>
              </span>
            </button>
          ))}

          {teamMembers.length === 0 && (
            <p
              className="px-3 py-2.5 text-sm text-center"
              style={{ color: "var(--text-muted, #6b7280)" }}
            >
              No team members
            </p>
          )}
        </div>
      )}
    </div>
  );
}
