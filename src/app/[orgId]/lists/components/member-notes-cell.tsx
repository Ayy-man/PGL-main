"use client";

import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
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
    // Debounce notes updates
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (notes !== initialNotes) {
      timeoutRef.current = setTimeout(async () => {
        setIsSaving(true);
        const result = await updateMemberNotesAction(memberId, notes);

        if (!result.success) {
          alert(result.error || "Failed to save notes");
          setNotes(initialNotes);
        }

        setIsSaving(false);
      }, 1000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [notes, initialNotes, memberId]);

  return (
    <div className="relative">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes..."
        className="min-w-[200px] resize-none"
        rows={2}
        disabled={isSaving}
      />
      {isSaving && (
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
          Saving...
        </div>
      )}
    </div>
  );
}
