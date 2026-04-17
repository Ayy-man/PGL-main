"use client";

import { useState, useEffect, useCallback } from "react";
import type { List } from "@/lib/lists/types";
import { ListGrid, type ListGridOptimisticHandle } from "./list-grid";
import { CreateListDialog } from "./create-list-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { List as ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { emptyStateCopy } from "@/lib/onboarding/empty-state-copy";

interface ListsPageClientProps {
  lists: List[];
  canEdit?: boolean;
  tenantId?: string;
  /**
   * Current authenticated user id — passed through to CreateListDialog so the
   * optimistic temp row carries the real `created_by` value before the server
   * confirm. Plan 44-04 (Pitfall 5): ensures the visibility badge on the
   * optimistic row reflects the creator correctly.
   */
  currentUserId?: string | null;
}

export function ListsPageClient({ lists: serverLists, canEdit = true, tenantId, currentUserId }: ListsPageClientProps) {
  const copy = emptyStateCopy("lists");
  const [lists, setLists] = useState(serverLists);
  // Imperative handle exposed by ListGrid so the dialog can push a pending row
  // into the grid the instant the user submits — without prop-drilling or
  // lifting grid state up to this page client. See 40-05-PLAN.md Task 2.
  const [gridHandle, setGridHandle] = useState<ListGridOptimisticHandle | null>(null);

  useEffect(() => { setLists(serverLists); }, [serverLists]);

  const handleListCreated = useCallback((list: List) => {
    setLists(prev => [list, ...prev]);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">Lists</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lists.length > 0
              ? `${lists.length} list${lists.length === 1 ? "" : "s"}`
              : "Organize prospects into targeted groups"}
          </p>
        </div>
        {canEdit ? (
          <CreateListDialog
            onCreated={handleListCreated}
            gridHandle={gridHandle}
            tenantId={tenantId}
            currentUserId={currentUserId}
          />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button disabled variant="gold-solid" size="sm">
                  Create List
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Only agents and admins can create lists.</TooltipContent>
          </Tooltip>
        )}
      </div>

      {lists.length === 0 ? (
        <EmptyState
          icon={ListIcon}
          title={copy.title}
          description={copy.body}
        >
          {/* copy.ctaLabel ("Create your first list") used for the disabled preview below;
              the enabled path opens CreateListDialog whose own trigger reads "Create List"
              to match the header button — single-source CTA, no label drift. */}
          {canEdit ? (
            <CreateListDialog
              onCreated={handleListCreated}
              gridHandle={gridHandle}
              tenantId={tenantId}
              currentUserId={currentUserId}
            />
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button disabled variant="gold-solid" size="sm">
                    {copy.ctaLabel}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Only agents and admins can create lists.</TooltipContent>
            </Tooltip>
          )}
        </EmptyState>
      ) : (
        <ListGrid lists={lists} canEdit={canEdit} onReady={setGridHandle} />
      )}
    </div>
  );
}
