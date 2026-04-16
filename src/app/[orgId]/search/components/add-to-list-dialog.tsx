"use client";

import { useState } from "react";
import type { ApolloPerson } from "@/lib/apollo/types";
import type { List } from "@/lib/lists/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { emitTourEvent } from "@/lib/onboarding/tour-event-bus";
import { ListPlus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

interface AddToListDialogProps {
  prospect: ApolloPerson;
  lists: List[];
  trigger: React.ReactNode;
  orgId: string;
}

export function AddToListDialog({
  prospect,
  lists,
  trigger,
  orgId,
}: AddToListDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const { toast } = useToast();

  const handleToggleList = (listId: string) => {
    setSelectedListIds((prev) =>
      prev.includes(listId)
        ? prev.filter((id) => id !== listId)
        : [...prev, listId]
    );
  };

  const handleSubmit = async () => {
    if (selectedListIds.length === 0) return;

    const listCount = selectedListIds.length;
    const listsToAdd = [...selectedListIds];

    // Close immediately and show optimistic toast
    setSelectedListIds([]);
    setOpen(false);
    toast({
      title: "Adding to list" + (listCount === 1 ? "" : "s"),
      description: `Adding ${prospect.name} to ${listCount} list${listCount === 1 ? "" : "s"}...`,
    });

    try {
      const response = await fetch("/api/prospects/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prospect,
          listIds: listsToAdd,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add prospect to lists");
      }

      const result = await response.json();

      // Fire tour event with the prospect ID so the tour can deep-link to
      // the dossier page for the just-added prospect. result.prospectId is
      // the DB-side id (not the Apollo id) returned by /api/prospects/upsert.
      const prospectId = result?.prospectId ?? null;
      emitTourEvent("list_added", { prospectId });

      toast({
        title: "Success",
        description: `Added ${prospect.name} to ${result.addedToLists} list${result.addedToLists === 1 ? "" : "s"}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add to lists",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to List</DialogTitle>
          <DialogDescription>
            Add <span className="font-medium text-foreground">{prospect.name}</span> to one or more lists
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {lists.length === 0 ? (
            <EmptyState icon={ListPlus} title="No lists yet">
              <Button variant="gold" size="sm" asChild>
                <Link href={`/${orgId}/lists`}>Create your first list</Link>
              </Button>
            </EmptyState>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {lists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    id={`list-${list.id}`}
                    checked={selectedListIds.includes(list.id)}
                    onCheckedChange={() => handleToggleList(list.id)}
                  />
                  <div className="flex-1 cursor-pointer" onClick={() => handleToggleList(list.id)}>
                    <Label
                      htmlFor={`list-${list.id}`}
                      className="font-medium cursor-pointer"
                    >
                      {list.name}
                    </Label>
                    {list.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {list.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {list.member_count} {list.member_count === 1 ? "member" : "members"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {lists.length > 0 && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedListIds.length === 0}
            >
              Add to {selectedListIds.length} List{selectedListIds.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
