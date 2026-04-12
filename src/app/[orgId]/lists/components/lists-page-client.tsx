"use client";

import { useState, useEffect, useCallback } from "react";
import type { List } from "@/lib/lists/types";
import { ListGrid } from "./list-grid";
import { CreateListDialog } from "./create-list-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { List as ListIcon } from "lucide-react";

interface ListsPageClientProps {
  lists: List[];
}

export function ListsPageClient({ lists: serverLists }: ListsPageClientProps) {
  const [lists, setLists] = useState(serverLists);

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
        <CreateListDialog onCreated={handleListCreated} />
      </div>

      {lists.length === 0 ? (
        <EmptyState
          icon={ListIcon}
          title="No lists yet"
          description="Create your first list to start organizing prospects for outreach."
        >
          <CreateListDialog onCreated={handleListCreated} />
        </EmptyState>
      ) : (
        <ListGrid lists={lists} />
      )}
    </div>
  );
}
