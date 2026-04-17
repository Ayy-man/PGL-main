"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Download, Loader2, Lock, Users } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { deleteListAction } from "../actions";
import type { List } from "@/lib/lists/types";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Confirmation,
  ConfirmationIcon,
  ConfirmationTitle,
  ConfirmationDescription,
} from "@/components/ui/confirmation";

/**
 * A list row as rendered by the grid. During optimistic create, the row may
 * carry a client-generated `temp-*` id and a `__pending: true` flag so the
 * UI can dim it + show a spinner. Once the server confirms, the reducer
 * replaces the temp row in place with the real server-returned list.
 */
export type OptimisticList = List & { __pending?: boolean };

export type OptimisticListsAction =
  | { type: "CREATE_PENDING"; tempList: OptimisticList }
  | { type: "CREATE_CONFIRMED"; tempId: string; realList: List }
  | { type: "CREATE_FAILED"; tempId: string }
  | { type: "DELETE_PENDING"; listId: string }
  | { type: "DELETE_UNDO"; previousLists: OptimisticList[] }
  | { type: "DELETE_CONFIRMED"; listId: string }
  | { type: "DELETE_FAILED"; previousLists: OptimisticList[] };

/**
 * Pure reducer for the optimistic lists grid. Extracted from ListGrid so we
 * can unit-test every state transition without RTL/jsdom — Phase 40 CONTEXT.md
 * locks the test strategy to pure helpers only.
 */
export function listsOptimisticReducer(
  state: OptimisticList[],
  action: OptimisticListsAction
): OptimisticList[] {
  switch (action.type) {
    case "CREATE_PENDING": {
      return [action.tempList, ...state];
    }
    case "CREATE_CONFIRMED": {
      const idx = state.findIndex((l) => l.id === action.tempId);
      if (idx === -1) return state;
      const next = state.slice();
      // Strip the __pending flag — confirmed rows render in full opacity.
      const { ...confirmed } = action.realList;
      next[idx] = confirmed;
      return next;
    }
    case "CREATE_FAILED": {
      const idx = state.findIndex((l) => l.id === action.tempId);
      if (idx === -1) return state;
      return state.filter((l) => l.id !== action.tempId);
    }
    case "DELETE_PENDING": {
      const idx = state.findIndex((l) => l.id === action.listId);
      if (idx === -1) return state;
      return state.filter((l) => l.id !== action.listId);
    }
    case "DELETE_UNDO": {
      // If the row is already present (e.g. server push already restored it
      // via revalidatePath), don't double-add.
      const alreadyRestored = action.previousLists.every((prev) =>
        state.some((cur) => cur.id === prev.id)
      );
      if (alreadyRestored) return state;
      return action.previousLists;
    }
    case "DELETE_CONFIRMED": {
      // DELETE_PENDING already removed the row; the server confirmation is
      // a no-op at the reducer level. Kept as a discrete action for clarity
      // and future instrumentation.
      return state;
    }
    case "DELETE_FAILED": {
      return action.previousLists;
    }
    default: {
      const _exhaustive: never = action;
      void _exhaustive;
      return state;
    }
  }
}

interface ListGridProps {
  lists: List[];
  canEdit?: boolean;
  /** Ref-like handle exposing the optimistic mutation API to sibling components. */
  onReady?: (handle: ListGridOptimisticHandle) => void;
}

/**
 * Imperative handle the grid exposes to sibling consumers (e.g. the create
 * dialog) so they can push a pending row, confirm it, or roll it back. This
 * keeps the scope of changes strictly inside ListGrid + its immediate
 * collaborators — the grid stays the sole owner of optimistic state.
 */
export interface ListGridOptimisticHandle {
  optimisticCreate: (tempList: OptimisticList) => void;
  confirmCreate: (tempId: string, realList: List) => void;
  failCreate: (tempId: string, errorMessage?: string) => void;
}

export function ListGrid({ lists: serverLists, canEdit = true, onReady }: ListGridProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const [lists, setLists] = useState<OptimisticList[]>(serverLists);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [pendingDeleteList, setPendingDeleteList] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  // When the server prop changes (e.g. after revalidatePath), re-sync local
  // state. Pending optimistic rows that the server hasn't observed yet will
  // be dropped — that's correct because their confirmation handler already
  // fired (or will fire) and reconcile independently.
  useEffect(() => { setLists(serverLists); }, [serverLists]);

  const optimisticCreate = useCallback((tempList: OptimisticList) => {
    setLists((prev) => listsOptimisticReducer(prev, { type: "CREATE_PENDING", tempList }));
  }, []);

  const confirmCreate = useCallback((tempId: string, realList: List) => {
    setLists((prev) => listsOptimisticReducer(prev, { type: "CREATE_CONFIRMED", tempId, realList }));
  }, []);

  const failCreate = useCallback((tempId: string, errorMessage?: string) => {
    setLists((prev) => listsOptimisticReducer(prev, { type: "CREATE_FAILED", tempId }));
    toast({
      title: "Create failed",
      description: errorMessage || "Could not create list.",
      variant: "destructive",
    });
  }, [toast]);

  // Expose imperative handle to siblings (CreateListDialog) via the onReady
  // callback — lets the dialog push pending rows without prop-drilling
  // through every intermediate component.
  useEffect(() => {
    onReady?.({ optimisticCreate, confirmCreate, failCreate });
  }, [onReady, optimisticCreate, confirmCreate, failCreate]);

  const handleRequestDelete = (list: { id: string; name: string }) => {
    setPendingDeleteList({ id: list.id, name: list.name });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteList) return;
    setDeleting(true);

    const previousLists = lists;
    const deletedId = pendingDeleteList.id;
    const deletedName = pendingDeleteList.name;

    // Fire DELETE_PENDING — row disappears from the grid immediately.
    setLists((prev) => listsOptimisticReducer(prev, { type: "DELETE_PENDING", listId: deletedId }));

    // NOTE: The Undo is a *visual* undo — it restores the row in the grid
    // only. The server delete has already fired by the time the toast is
    // shown, so clicking Undo after the server commits will re-render the
    // row in the UI until the next revalidatePath / router.refresh flushes
    // it back out. A server-side undo would require an undelete endpoint
    // (out of scope for Phase 40). See 40-05-PLAN.md Task 1 for rationale.
    toast({
      title: `Deleted "${deletedName}"`,
      action: (
        <ToastAction
          altText="Undo"
          onClick={() =>
            setLists((prev) => listsOptimisticReducer(prev, { type: "DELETE_UNDO", previousLists }))
          }
        >
          Undo
        </ToastAction>
      ),
    });

    const result = await deleteListAction(deletedId);
    if (!result.success) {
      setLists((prev) => listsOptimisticReducer(prev, { type: "DELETE_FAILED", previousLists }));
      toast({
        title: "Delete failed",
        description: result.error || "Could not delete list.",
        variant: "destructive",
      });
    } else {
      // No UI change needed — DELETE_PENDING already removed the row. The
      // dispatch is kept for clarity and future instrumentation.
      setLists((prev) => listsOptimisticReducer(prev, { type: "DELETE_CONFIRMED", listId: deletedId }));
    }

    setDeleting(false);
    setPendingDeleteList(null);
  };

  const handleExport = async (listId: string, listName: string) => {
    setExportingId(listId);
    try {
      const response = await fetch(`/api/export/csv?listId=${listId}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Export failed" }));
        toast({ title: "Export failed", description: err.error || "Could not export list.", variant: "destructive" });
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${listName.replace(/[^a-zA-Z0-9-_ ]/g, "")}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: `Downloaded ${listName} as CSV.` });
    } catch {
      toast({ title: "Export failed", description: "Network error.", variant: "destructive" });
    } finally {
      setExportingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {lists.map((list, index) => {
        const pending = list.__pending === true;
        return (
          <div
            key={list.id}
            className={`surface-card card-glow press-effect flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 sm:px-7 rounded-xl cursor-pointer group animate-stagger-in${pending ? " opacity-50 pointer-events-none" : ""}`}
            style={{ animationDelay: `${index * 50}ms` }}
            aria-busy={pending || undefined}
          >
            {/* Left side */}
            <div className="flex-1 min-w-0 mr-6">
              <div className="flex items-center gap-2">
                <p className="font-serif text-base sm:text-[20px] font-semibold text-foreground truncate">
                  {list.name}
                </p>
                {pending && (
                  <Loader2
                    className="h-4 w-4 animate-spin shrink-0"
                    style={{ color: "var(--gold-primary)" }}
                    aria-label="Creating list"
                  />
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0} className="inline-flex shrink-0">
                      {list.visibility === "personal" ? (
                        <Lock
                          className="h-3.5 w-3.5"
                          style={{ color: "var(--text-ghost)" }}
                          aria-label="Personal list"
                        />
                      ) : (
                        <Users
                          className="h-3.5 w-3.5"
                          style={{ color: "var(--text-ghost)" }}
                          aria-label="Team shared list"
                        />
                      )}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {list.visibility === "personal"
                      ? "Private — only you and admins"
                      : "Team shared"}
                  </TooltipContent>
                </Tooltip>
              </div>
              {list.description && (
                <p className="text-[13px] text-muted-foreground mt-0.5 truncate">
                  {list.description}
                </p>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3 sm:gap-6 shrink-0 mt-3 sm:mt-0">
              {/* Member count */}
              <div className="flex flex-col items-center">
                <span
                  className="font-serif text-lg sm:text-[22px] font-bold leading-none"
                  style={{ color: "var(--gold-primary)" }}
                >
                  {list.member_count}
                </span>
                <span className="text-xs text-muted-foreground mt-0.5">members</span>
              </div>

              {/* Updated date */}
              <span className="text-xs text-muted-foreground hidden sm:block">
                {formatDate(list.updated_at)}
              </span>

              {/* Export button */}
              <Button
                variant="ghost"
                size="sm"
                data-tour-id="export-csv"
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Export list"
                onClick={() => handleExport(list.id, list.name)}
                disabled={pending || exportingId === list.id}
              >
                {exportingId === list.id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Download className="h-4 w-4" />}
              </Button>

              {/* Delete button */}
              {canEdit ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                  onClick={() => handleRequestDelete({ id: list.id, name: list.name })}
                  aria-label="Delete list"
                  disabled={pending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span tabIndex={0}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground opacity-40 cursor-not-allowed"
                        disabled
                        aria-label="Delete list (not available)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Assistants cannot delete lists.</TooltipContent>
                </Tooltip>
              )}

              {/* View button */}
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="cursor-pointer"
                style={{ color: "var(--gold-primary)" }}
              >
                <Link
                  href={`/${orgId}/lists/${list.id}`}
                  aria-disabled={pending || undefined}
                >
                  View →
                </Link>
              </Button>
            </div>
          </div>
        );
      })}

      <Dialog open={!!pendingDeleteList} onOpenChange={(o) => !o && setPendingDeleteList(null)}>
        <DialogContent>
          <Confirmation
            isDestructive
            confirmLabel="Delete list"
            cancelLabel="Cancel"
            onConfirm={handleConfirmDelete}
            onCancel={() => setPendingDeleteList(null)}
            isLoading={deleting}
          >
            <ConfirmationIcon variant="destructive" />
            <ConfirmationTitle>Delete {pendingDeleteList?.name}?</ConfirmationTitle>
            <ConfirmationDescription>
              This permanently removes the list and its member snapshot. Enriched prospect records remain, but list membership is lost.
            </ConfirmationDescription>
          </Confirmation>
        </DialogContent>
      </Dialog>
    </div>
  );
}
