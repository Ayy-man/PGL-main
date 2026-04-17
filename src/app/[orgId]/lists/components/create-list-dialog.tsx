"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, Lock } from "lucide-react";
import { createListAction } from "../actions";
import { useToast } from "@/hooks/use-toast";
import type { List } from "@/lib/lists/types";
import type { Visibility } from "@/types/visibility";
import type { OptimisticList, ListGridOptimisticHandle } from "./list-grid";

interface CreateListDialogProps {
  /**
   * Called after the server confirms the create. Retained for callers that
   * only care about the confirmed row (e.g. lists-page-client syncing its
   * top-level serverLists state).
   */
  onCreated?: (list: List) => void;
  /**
   * Imperative handle exposed by ListGrid. When provided, the dialog drives
   * the grid's optimistic state directly — a temp row appears the instant
   * the user submits, then reconciles to the real row on server success or
   * is rolled back on server failure.
   */
  gridHandle?: ListGridOptimisticHandle | null;
  /**
   * Tenant id for the optimistic row shape. Not required for the server call
   * (the action derives tenant from auth); only used to fill the temp row so
   * the `List` type is satisfied until reconcile.
   */
  tenantId?: string;
  /**
   * Current authenticated user id — used for the optimistic temp row's
   * `created_by` field so the grid badge renders correctly pre-confirm
   * (Plan 44-04 Pitfall 5). Optional: when null, the temp row's
   * `created_by` is null; the real row from the server will carry the
   * correct creator id once the mutation reconciles.
   */
  currentUserId?: string | null;
}

function makeTempList(
  name: string,
  description: string | null,
  tenantId: string,
  visibility: Visibility,
  createdBy: string | null,
): OptimisticList {
  const now = new Date().toISOString();
  return {
    id: `temp-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`,
    tenant_id: tenantId,
    name,
    description,
    member_count: 0,
    // Plan 44-04: thread selected visibility + creator id from the dialog's
    // segmented control so the optimistic grid badge renders correctly
    // pre-confirm (Pitfall 5).
    visibility,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
    __pending: true,
  };
}

export function CreateListDialog({ onCreated, gridHandle, tenantId, currentUserId }: CreateListDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>("team_shared");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const rawName = (formData.get("name") as string | null)?.trim() || "Untitled list";
    const rawDescription = (formData.get("description") as string | null)?.trim() || null;

    // Push the optimistic pending row into the grid before awaiting the
    // server — this is the core UX win: Maggie sees the new list instantly.
    // Thread selected visibility + currentUserId so the pre-confirm badge
    // renders correctly (Pitfall 5).
    const tempList = gridHandle
      ? makeTempList(rawName, rawDescription, tenantId ?? "", visibility, currentUserId ?? null)
      : null;
    if (gridHandle && tempList) {
      gridHandle.optimisticCreate(tempList);
    }

    // Close dialog immediately so the grid's new row is visible.
    setOpen(false);

    const result = await createListAction(formData);
    if (result.success && result.list) {
      if (gridHandle && tempList) {
        gridHandle.confirmCreate(tempList.id, result.list);
      }
      onCreated?.(result.list);
      // Success toast is suppressed when the optimistic grid handle is wired
      // — the visible new row is the confirmation. When no grid handle is
      // available (empty-state render path), fall back to the toast.
      if (!gridHandle) {
        toast({ title: "List created" });
      }
    } else {
      if (gridHandle && tempList) {
        gridHandle.failCreate(tempList.id, result.error);
      } else {
        toast({
          title: "Failed to create list",
          description: result.error || "An error occurred",
          variant: "destructive",
        });
      }
      // Re-open dialog on failure so the user can retry without retyping.
      setOpen(true);
    }

    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gold">
          <Plus className="h-4 w-4 mr-2" />
          Create List
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="font-serif">Create New List</DialogTitle>
            <DialogDescription>
              Give your list a name and optional description. You can add prospects to it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="High Net Worth Prospects"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Executives with $10M+ net worth for Q1 outreach"
                rows={3}
                disabled={isSubmitting}
              />
            </div>
            {/* Plan 44-04 (D-10): Visibility segmented control. Hidden input
                carries the current value into FormData for createListAction,
                which validates via isVisibility() server-side. */}
            <div className="space-y-2">
              <Label>Visibility</Label>
              <input type="hidden" name="visibility" value={visibility} />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility("team_shared")}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[8px] text-[12px] cursor-pointer transition-all"
                  style={{
                    background: visibility === "team_shared" ? "var(--gold-bg)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${visibility === "team_shared" ? "var(--border-gold)" : "rgba(255,255,255,0.08)"}`,
                    color: visibility === "team_shared" ? "var(--gold-primary)" : "var(--text-secondary)",
                  }}
                  aria-pressed={visibility === "team_shared"}
                >
                  <Users className="h-3.5 w-3.5" />
                  Team shared
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility("personal")}
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-[8px] text-[12px] cursor-pointer transition-all"
                  style={{
                    background: visibility === "personal" ? "var(--gold-bg)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${visibility === "personal" ? "var(--border-gold)" : "rgba(255,255,255,0.08)"}`,
                    color: visibility === "personal" ? "var(--gold-primary)" : "var(--text-secondary)",
                  }}
                  aria-pressed={visibility === "personal"}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Personal
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                {visibility === "personal"
                  ? "Only you and admins can see this list."
                  : "Everyone on the team can see this list."}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
