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
import { Loader2, ListPlus } from "lucide-react";
import Link from "next/link";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/prospects/upsert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prospect,
          listIds: selectedListIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to add prospect to lists");
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: `Added ${prospect.name} to ${result.addedToLists} list${result.addedToLists === 1 ? "" : "s"}`,
      });

      // Reset and close
      setSelectedListIds([]);
      setOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to add to lists",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
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
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <ListPlus className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                No lists yet
              </p>
              <Button size="sm" asChild>
                <Link href={`/${orgId}/lists`}>Create your first list</Link>
              </Button>
            </div>
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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedListIds.length === 0 || isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add to {selectedListIds.length} List{selectedListIds.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
