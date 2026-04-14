"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2, Download, Loader2 } from "lucide-react";
import { deleteListAction } from "../actions";
import type { List } from "@/lib/lists/types";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Confirmation,
  ConfirmationIcon,
  ConfirmationTitle,
  ConfirmationDescription,
} from "@/components/ui/confirmation";

interface ListGridProps {
  lists: List[];
}

export function ListGrid({ lists: serverLists }: ListGridProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const [lists, setLists] = useState(serverLists);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [pendingDeleteList, setPendingDeleteList] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => { setLists(serverLists); }, [serverLists]);

  const handleRequestDelete = (list: { id: string; name: string }) => {
    setPendingDeleteList({ id: list.id, name: list.name });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDeleteList) return;
    setDeleting(true);

    const previousLists = lists;
    setLists(prev => prev.filter(l => l.id !== pendingDeleteList.id));
    toast({ title: "List deleted" });

    const result = await deleteListAction(pendingDeleteList.id);
    if (!result.success) {
      setLists(previousLists);
      toast({ title: "Delete failed", description: result.error || "Could not delete list.", variant: "destructive" });
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
      {lists.map((list, index) => (
        <div
          key={list.id}
          className="surface-card card-glow press-effect flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 sm:px-7 rounded-xl cursor-pointer group animate-stagger-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Left side */}
          <div className="flex-1 min-w-0 mr-6">
            <p className="font-serif text-base sm:text-[20px] font-semibold text-foreground truncate">
              {list.name}
            </p>
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
              className="text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Export list"
              onClick={() => handleExport(list.id, list.name)}
              disabled={exportingId === list.id}
            >
              {exportingId === list.id
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Download className="h-4 w-4" />}
            </Button>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
              onClick={() => handleRequestDelete({ id: list.id, name: list.name })}
              aria-label="Delete list"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>

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
              >
                View →
              </Link>
            </Button>
          </div>
        </div>
      ))}

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
