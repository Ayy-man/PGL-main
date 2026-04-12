"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ListPlus } from "lucide-react";
import Link from "next/link";

interface ListItem {
  id: string;
  name: string;
  description?: string | null;
  member_count: number;
}

interface AddToListDialogProfileProps {
  prospectId: string;
  prospectName: string;
  lists: ListItem[];
  orgId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToListDialogProfile({
  prospectId,
  prospectName,
  lists,
  orgId,
  open,
  onOpenChange,
}: AddToListDialogProfileProps) {
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
    onOpenChange(false);
    toast({
      title: "Adding to list" + (listCount === 1 ? "" : "s"),
      description: `Adding ${prospectName} to ${listCount} list${listCount === 1 ? "" : "s"}...`,
    });

    try {
      const response = await fetch("/api/prospects/add-to-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId, listIds: listsToAdd }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to add to lists");
      }
      const result = await response.json();
      toast({
        title: "Success",
        description: `Added ${prospectName} to ${result.addedToLists} list${result.addedToLists === 1 ? "" : "s"}`,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to List</DialogTitle>
          <DialogDescription>
            Add{" "}
            <span className="font-medium text-foreground">{prospectName}</span>{" "}
            to one or more lists
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {lists.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <ListPlus className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">No lists yet</p>
              <Button size="sm" asChild>
                <Link href={`/${orgId}/lists`}>Create your first list</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {lists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleToggleList(list.id)}
                >
                  <Checkbox
                    id={`profile-list-${list.id}`}
                    checked={selectedListIds.includes(list.id)}
                    onCheckedChange={() => handleToggleList(list.id)}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`profile-list-${list.id}`}
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
                      {list.member_count}{" "}
                      {list.member_count === 1 ? "member" : "members"}
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedListIds.length === 0}
            >
              Add to {selectedListIds.length} List
              {selectedListIds.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
