"use client";

import type { ColumnDef, SortingState } from "@tanstack/react-table";
import type { ApolloPerson } from "@/lib/apollo/types";
import type { List } from "@/lib/lists/types";
import { DataTable } from "@/components/ui/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Check, X, ListPlus } from "lucide-react";
import { AddToListDialog } from "./add-to-list-dialog";

function getLocation(person: ApolloPerson): string {
  const parts = [person.city, person.state, person.country].filter(Boolean);
  return parts.join(", ") || "---";
}

function getEmailStatusBadge(status: string | undefined) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Unknown
      </Badge>
    );
  }

  switch (status.toLowerCase()) {
    case "verified":
      return (
        <Badge className="text-xs bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25">
          Verified
        </Badge>
      );
    case "guessed":
      return (
        <Badge className="text-xs bg-yellow-500/15 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/25">
          Guessed
        </Badge>
      );
    case "unavailable":
      return (
        <Badge variant="destructive" className="text-xs">
          Unavailable
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          {status}
        </Badge>
      );
  }
}

function createColumns(lists: List[], orgId: string): ColumnDef<ApolloPerson>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      enableSorting: true,
      cell: ({ row }) => (
        <div className="font-medium min-w-[140px]">
          {row.original.name}
        </div>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      enableSorting: true,
      cell: ({ row }) => {
        const title = row.original.title;
        if (!title) return <span className="text-muted-foreground">---</span>;

        if (title.length > 40) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block max-w-[200px] truncate text-muted-foreground">
                    {title}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>{title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }
        return <span className="text-muted-foreground">{title}</span>;
      },
    },
    {
      accessorFn: (row) => row.organization_name,
      id: "company",
      header: "Company",
      enableSorting: true,
      cell: ({ row }) => {
        const company = row.original.organization_name;
        if (!company) return <span className="text-muted-foreground">---</span>;
        return <span>{company}</span>;
      },
    },
    {
      id: "location",
      header: "Location",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {getLocation(row.original)}
        </span>
      ),
    },
    {
      id: "email_status",
      header: "Email",
      enableSorting: false,
      cell: ({ row }) => getEmailStatusBadge(row.original.email_status),
    },
    {
      id: "phone",
      header: "Phone",
      enableSorting: false,
      cell: ({ row }) => {
        const hasPhone =
          row.original.phone_numbers && row.original.phone_numbers.length > 0;
        return hasPhone ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground/50" />
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <AddToListDialog
          prospect={row.original}
          lists={lists}
          orgId={orgId}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-[oklch(0.84_0.15_84)]"
            >
              <ListPlus className="h-3.5 w-3.5 mr-1" />
              Add to List
            </Button>
          }
        />
      ),
    },
  ];
}

interface SearchResultsTableProps {
  results: ApolloPerson[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalEntries: number;
    hasMore: boolean;
  };
  isLoading: boolean;
  searchState: {
    persona: string;
    page: number;
    sortBy: string;
    sortOrder: string;
  };
  setSearchState: (
    update: Partial<{
      persona: string;
      page: number;
      sortBy: string;
      sortOrder: string;
    }>
  ) => void;
  lists: List[];
  orgId: string;
}

export function SearchResultsTable({
  results,
  pagination,
  isLoading,
  searchState,
  setSearchState,
  lists,
  orgId,
}: SearchResultsTableProps) {
  // Create columns with lists and orgId
  const columns = createColumns(lists, orgId);
  // Convert search state to TanStack sorting state
  const sorting: SortingState = searchState.sortBy
    ? [{ id: searchState.sortBy, desc: searchState.sortOrder === "desc" }]
    : [];

  const handleSortingChange = (newSorting: SortingState) => {
    if (newSorting.length > 0) {
      setSearchState({
        sortBy: newSorting[0].id,
        sortOrder: newSorting[0].desc ? "desc" : "asc",
      });
    } else {
      setSearchState({
        sortBy: "name",
        sortOrder: "asc",
      });
    }
  };

  const handlePaginationChange = (pageIndex: number) => {
    setSearchState({ page: pageIndex + 1 }); // Convert 0-indexed to 1-indexed
  };

  return (
    <DataTable
      columns={columns}
      data={results}
      pageCount={pagination.totalPages}
      pageIndex={searchState.page - 1} // Convert 1-indexed URL to 0-indexed table
      pageSize={pagination.pageSize}
      onPaginationChange={handlePaginationChange}
      sorting={sorting}
      onSortingChange={handleSortingChange}
      isLoading={isLoading}
      totalResults={pagination.totalEntries}
    />
  );
}
