"use client";

import { useState, useEffect, useRef } from "react";
import { updateMemberNotesAction } from "../actions";

interface MemberNotesCellProps {
  memberId: string;
  initialNotes: string;
}

export function MemberNotesCell({ memberId, initialNotes }: MemberNotesCellProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (notes !== initialNotes) {
      timeoutRef.current = setTimeout(async () => {
        setIsSaving(true);
        const result = await updateMemberNotesAction(memberId, notes);
        if (!result.success) {
          setNotes(initialNotes);
        }
        setIsSaving(false);
      }, 1000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [notes, initialNotes, memberId]);

  return (
    <input
      type="text"
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      placeholder="Add notes..."
      disabled={isSaving}
      className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground/40 border-0 outline-none focus:ring-0 py-0.5 px-0 truncate"
      style={{
        borderBottom: "1px solid transparent",
      }}
      onFocus={(e) => {
        (e.target as HTMLInputElement).style.borderBottomColor = "rgba(212,175,55,0.3)";
      }}
      onBlur={(e) => {
        (e.target as HTMLInputElement).style.borderBottomColor = "transparent";
      }}
    />
  );
}
