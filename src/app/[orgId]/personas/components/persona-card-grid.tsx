"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Persona } from "@/lib/personas/types";
import { PersonaCard } from "./persona-card";
import { PersonaFormDialog } from "./persona-form-dialog";
import { deletePersonaAction } from "../actions";
import { useToast } from "@/hooks/use-toast";
import { Plus, Sparkles } from "lucide-react";

interface PersonaCardGridProps {
  personas: Persona[];
  orgId: string;
}

export function PersonaCardGrid({ personas: serverPersonas, orgId }: PersonaCardGridProps) {
  const [personas, setPersonas] = useState(serverPersonas);
  const [createOpen, setCreateOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => { setPersonas(serverPersonas); }, [serverPersonas]);

  const handleDeletePersona = useCallback(async (personaId: string) => {
    const previousPersonas = personas;
    setPersonas(prev => prev.filter(p => p.id !== personaId));
    toast({ title: "Saved search deleted" });

    try {
      await deletePersonaAction(personaId);
    } catch {
      setPersonas(previousPersonas);
      toast({ title: "Delete failed", description: "Could not delete saved search.", variant: "destructive" });
    }
  }, [personas, toast]);

  const handlePersonaCreated = useCallback((persona: Persona) => {
    setPersonas(prev => [persona, ...prev]);
    toast({ title: "Saved search created" });
  }, [toast]);

  const handlePersonaUpdated = useCallback((persona: Persona) => {
    setPersonas(prev => prev.map(p => p.id === persona.id ? persona : p));
    toast({ title: "Saved search updated" });
  }, [toast]);

  // Auto-open create dialog from quick action (?create=true)
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setCreateOpen(true);
      router.replace(`/${orgId}/personas`, { scroll: false });
    }
  }, [searchParams, orgId, router]);

  return (
    <div className="grid gap-4 md:gap-5 content-start grid-cols-1 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
      {personas.map((persona, index) => (
        <div key={persona.id} className="animate-stagger-in" style={{ animationDelay: `${index * 50}ms` }}>
          <PersonaCard persona={persona} onDelete={handleDeletePersona} onUpdated={handlePersonaUpdated} />
        </div>
      ))}

      {/* Create New Persona CTA card */}
      <PersonaFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handlePersonaCreated}
        trigger={
          <button
            className="rounded-[14px] p-5 md:p-7 w-full cursor-pointer flex flex-col items-center justify-center gap-4 transition-all group card-interactive"
            style={{
              border: "1px dashed var(--border-default)",
              minHeight: "180px",
            }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full"
              style={{ background: "var(--gold-bg)" }}
            >
              <Plus
                className="h-5 w-5"
                style={{ color: "var(--gold-primary)" }}
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span
                className="text-[14px] font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                New Saved Search
              </span>
              <span className="flex items-center gap-1 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                <Sparkles className="h-3 w-3" />
                Define your ideal buyer profile
              </span>
            </div>
          </button>
        }
      />
    </div>
  );
}
