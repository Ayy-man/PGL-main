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
        <Card key={list.id} className="flex flex-col transition-all duration-150 hover:border-gold/20">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-lg">{list.name}</CardTitle>
            {list.description && (
              <CardDescription className="line-clamp-2">{list.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-2xl font-bold tabular-nums text-foreground">{list.member_count}</span>
                <span className="ml-1.5 text-xs text-muted-foreground">prospects</span>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-xs text-muted-foreground">
                Updated {formatDate(list.updated_at)}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2 pt-0">
            <Button asChild size="sm" className="flex-1 cursor-pointer">
              <Link href={`/${orgId}/lists/${list.id}`}>View List</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
              onClick={() => handleDelete(list.id)}
              disabled={deletingId === list.id}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
