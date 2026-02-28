"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Note {
  id: string;
  body: string;
  author: string;
  createdAt: string;
}

interface NotesTabProps {
  notes: Note[];
  prospectId: string;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export function NotesTab({ notes, prospectId }: NotesTabProps) {
  const [noteText, setNoteText] = useState("");

  const handleSubmit = () => {
    if (!noteText.trim()) return;
    // Stub: log to console. Feature phase will implement API call.
    console.log("Add note (stub):", { prospectId, body: noteText.trim() });
    setNoteText("");
  };

  return (
    <div className="space-y-4">
      {/* Add Note Section */}
      <div className="surface-card p-4 space-y-3">
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Add a note..."
          className="w-full min-h-[80px] resize-none rounded-md bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-border"
          aria-label="Note text"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            className="cursor-pointer"
            style={{
              background: "var(--gold-bg-strong)",
              borderColor: "var(--border-gold)",
              color: "var(--gold-primary)",
            }}
            onClick={handleSubmit}
            disabled={!noteText.trim()}
          >
            Add Note
          </Button>
        </div>
      </div>

      {/* Note Cards */}
      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-md bg-muted p-3 space-y-1"
            >
              <p className="text-sm text-foreground">{note.body}</p>
              <p className="text-xs text-muted-foreground">
                {note.author} &middot; {formatRelativeDate(note.createdAt)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No notes yet. Add a note to track interactions.
        </p>
      )}
    </div>
  );
}
