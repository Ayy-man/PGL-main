"use client";

import { ListPlus, Download, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onAddToList: () => void;
  onExport: () => void;
  onEnrich: () => void;
  onDismiss?: () => void;     // NEW
  showDismiss?: boolean;       // NEW — only show in saved search mode
  canEdit?: boolean;           // false for assistant role
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onAddToList,
  onExport,
  onEnrich,
  onDismiss,
  showDismiss,
  canEdit = true,
}: BulkActionsBarProps) {
  const someSelected = selectedCount > 0 && selectedCount < totalCount;

  return (
    <div
      className="flex items-center justify-between rounded-[10px] px-4 py-3 mb-3 animate-slide-up"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
      }}
    >
      {/* Left side: checkbox + label */}
      <div className="flex items-center gap-2.5">
        <Checkbox
          checked={someSelected ? "indeterminate" : allSelected}
          onCheckedChange={onSelectAll}
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
          {canEdit ? (
            <Button variant="ghost" size="sm" onClick={onAddToList}>
              <ListPlus className="h-4 w-4 mr-1.5" />
              Add to List
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button variant="ghost" size="sm" disabled>
                    <ListPlus className="h-4 w-4 mr-1.5" />
                    Add to List
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Assistants cannot add prospects to lists.</TooltipContent>
            </Tooltip>
          )}

          {/* Export CSV stays enabled — read-safe operation */}
          <Button variant="ghost" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </Button>

          {canEdit ? (
            <Button variant="gold" size="sm" onClick={onEnrich}>
              <Sparkles className="h-4 w-4 mr-1.5" />
              Enrich Selection
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button variant="gold" size="sm" disabled>
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Enrich Selection
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Assistants cannot trigger enrichment.</TooltipContent>
            </Tooltip>
          )}

          {showDismiss && onDismiss && (
            canEdit ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Dismiss Selected
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      className="text-red-400/50"
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Dismiss Selected
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Assistants cannot dismiss prospects.</TooltipContent>
              </Tooltip>
            )
          )}
        </div>
      )}
    </div>
  );
}
