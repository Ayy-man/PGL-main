"use client";

import { ListPlus, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onAddToList: () => void;
  onExport: () => void;
  onEnrich: () => void;
}

export function BulkActionsBar({
  selectedCount,
  allSelected,
  onSelectAll,
  onAddToList,
  onExport,
  onEnrich,
}: BulkActionsBarProps) {
  return (
    <div
      className="flex items-center justify-between rounded-[10px] px-4 py-3 mb-3"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
      }}
    >
      {/* Left side: checkbox + label */}
      <div className="flex items-center gap-2.5">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={onSelectAll}
          className="h-4 w-4 rounded cursor-pointer accent-[var(--gold-primary)]"
          aria-label="Select all prospects"
        />
        <span
          className="text-[13px]"
          style={{ color: "var(--text-secondary-ds)" }}
        >
          {selectedCount > 0 ? `${selectedCount} selected` : "Select All"}
        </span>
      </div>

      {/* Right side: action buttons — only visible when items are selected */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onAddToList}>
            <ListPlus className="h-4 w-4 mr-1.5" />
            Add to List
          </Button>
          <Button variant="ghost" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>
          <Button variant="gold" size="sm" onClick={onEnrich}>
            <Sparkles className="h-4 w-4 mr-1.5" />
            Enrich Selection
          </Button>
        </div>
      )}
    </div>
  );
}
