"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Persona } from "@/lib/personas/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Pencil, Trash2, Calendar } from "lucide-react";
import { PersonaFormDialog } from "./persona-form-dialog";
import { deletePersonaAction } from "../actions";

interface PersonaListProps {
  personas: Persona[];
}

export function PersonaList({ personas }: PersonaListProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {personas.map((persona) => (
        <PersonaCard key={persona.id} persona={persona} orgId={orgId} />
      ))}
    </div>
  );
}

function PersonaCard({ persona, orgId }: { persona: Persona; orgId: string }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${persona.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePersonaAction(persona.id);
    } catch (error) {
      alert(`Failed to delete persona: ${error instanceof Error ? error.message : "Unknown error"}`);
      setIsDeleting(false);
    }
  };

  const formatFilterSummary = () => {
    const filters = persona.filters;
    const parts: string[] = [];

    if (filters.titles && filters.titles.length > 0) {
      const displayed = filters.titles.slice(0, 3).join(", ");
      const extra = filters.titles.length > 3 ? ` + ${filters.titles.length - 3} more` : "";
      parts.push(`Titles: ${displayed}${extra}`);
    }

    if (filters.industries && filters.industries.length > 0) {
      const displayed = filters.industries.slice(0, 3).join(", ");
      const extra = filters.industries.length > 3 ? ` + ${filters.industries.length - 3} more` : "";
      parts.push(`Industries: ${displayed}${extra}`);
    }

    if (filters.seniorities && filters.seniorities.length > 0) {
      const senioritiesDisplay = filters.seniorities
        .map(s => s.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase()))
        .slice(0, 3)
        .join(", ");
      const extra = filters.seniorities.length > 3 ? ` + ${filters.seniorities.length - 3} more` : "";
      parts.push(`Seniority: ${senioritiesDisplay}${extra}`);
    }

    if (filters.locations && filters.locations.length > 0) {
      const displayed = filters.locations.slice(0, 2).join(", ");
      const extra = filters.locations.length > 2 ? ` + ${filters.locations.length - 2} more` : "";
      parts.push(`Locations: ${displayed}${extra}`);
    }

    if (filters.companySize && filters.companySize.length > 0) {
      parts.push(`Company Size: ${filters.companySize.length} range${filters.companySize.length > 1 ? "s" : ""}`);
    }

    if (filters.keywords) {
      const keywordPreview = filters.keywords.length > 30
        ? filters.keywords.slice(0, 30) + "..."
        : filters.keywords;
      parts.push(`Keywords: ${keywordPreview}`);
    }

    return parts.join(" | ");
  };

  const formatLastUsed = () => {
    if (!persona.last_used_at) return "Never used";
    const date = new Date(persona.last_used_at);
    return `Last used: ${date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })}`;
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-xl">
            {persona.name}
          </CardTitle>
          {persona.is_starter && (
            <Badge variant="secondary" className="shrink-0">
              Starter
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        {persona.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {persona.description}
          </p>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p className="line-clamp-3">{formatFilterSummary()}</p>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatLastUsed()}</span>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button asChild size="sm" className="flex-1">
          <Link href={`/${orgId}/search?persona=${persona.id}`}>
            <Search className="h-4 w-4" />
            Search
          </Link>
        </Button>

        {!persona.is_starter && (
          <>
            <PersonaFormDialog
              mode="edit"
              persona={persona}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4" />
                </Button>
              }
            />

            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
