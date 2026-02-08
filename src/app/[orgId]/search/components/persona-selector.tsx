"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { Persona } from "@/lib/personas/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Settings } from "lucide-react";

interface PersonaSelectorProps {
  personas: Persona[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function getFilterSummary(persona: Persona): string {
  const parts: string[] = [];

  if (persona.filters.titles?.length) {
    const titles = persona.filters.titles.slice(0, 2).join(", ");
    const more = persona.filters.titles.length > 2
      ? ` +${persona.filters.titles.length - 2}`
      : "";
    parts.push(titles + more);
  }

  if (persona.filters.industries?.length) {
    const industries = persona.filters.industries.slice(0, 1).join(", ");
    const more = persona.filters.industries.length > 1
      ? ` +${persona.filters.industries.length - 1}`
      : "";
    parts.push(industries + more);
  }

  if (persona.filters.seniorities?.length) {
    parts.push(persona.filters.seniorities.slice(0, 1).join(", "));
  }

  return parts.join(" | ") || "No filters";
}

export function PersonaSelector({
  personas,
  selectedId,
  onSelect,
}: PersonaSelectorProps) {
  const params = useParams();
  const orgId = params.orgId as string;

  const starterPersonas = personas.filter((p) => p.is_starter);
  const customPersonas = personas.filter((p) => !p.is_starter);

  return (
    <Select value={selectedId} onValueChange={onSelect}>
      <SelectTrigger className="w-[320px]">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Select a persona to search..." />
        </div>
      </SelectTrigger>
      <SelectContent>
        {starterPersonas.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground uppercase tracking-wider">
              Starter Personas
            </SelectLabel>
            {starterPersonas.map((persona) => (
              <SelectItem key={persona.id} value={persona.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{persona.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {getFilterSummary(persona)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {starterPersonas.length > 0 && customPersonas.length > 0 && (
          <SelectSeparator />
        )}
        {customPersonas.length > 0 && (
          <SelectGroup>
            <SelectLabel className="text-xs text-muted-foreground uppercase tracking-wider">
              My Personas
            </SelectLabel>
            {customPersonas.map((persona) => (
              <SelectItem key={persona.id} value={persona.id}>
                <div className="flex flex-col">
                  <span className="font-medium">{persona.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {getFilterSummary(persona)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        <SelectSeparator />
        <div className="px-2 py-1.5">
          <Link
            href={`/${orgId}/personas`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[oklch(0.84_0.15_84)] transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Manage Personas
          </Link>
        </div>
      </SelectContent>
    </Select>
  );
}
