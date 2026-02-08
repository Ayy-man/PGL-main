"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteListAction } from "../actions";
import type { List } from "@/lib/lists/types";
import { useState } from "react";

interface ListGridProps {
  lists: List[];
}

export function ListGrid({ lists }: ListGridProps) {
  const params = useParams();
  const orgId = params.orgId as string;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (listId: string) => {
    if (!confirm("Are you sure you want to delete this list? This cannot be undone.")) {
      return;
    }

    setDeletingId(listId);
    const result = await deleteListAction(listId);

    if (!result.success) {
      alert(result.error || "Failed to delete list");
    }

    setDeletingId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {lists.map((list) => (
        <Card key={list.id} className="flex flex-col">
          <CardHeader>
            <CardTitle className="font-serif">{list.name}</CardTitle>
            {list.description && (
              <CardDescription>{list.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Members</span>
                <span className="font-medium">{list.member_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">{formatDate(list.updated_at)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button asChild className="flex-1">
              <Link href={`/${orgId}/lists/${list.id}`}>View</Link>
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => handleDelete(list.id)}
              disabled={deletingId === list.id}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
