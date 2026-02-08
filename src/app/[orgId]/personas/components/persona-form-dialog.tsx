"use client";

import { useState, useTransition } from "react";
import type { Persona } from "@/lib/personas/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createPersonaAction, updatePersonaAction } from "../actions";

interface PersonaFormDialogProps {
  mode: "create" | "edit";
  persona?: Persona;
  trigger: React.ReactNode;
}

export function PersonaFormDialog({ mode, persona, trigger }: PersonaFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createPersonaAction(formData);
        } else if (persona) {
          await updatePersonaAction(persona.id, formData);
        }
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    });
  };

  const defaultValues = mode === "edit" && persona ? {
    name: persona.name,
    description: persona.description || "",
    titles: persona.filters.titles?.join(", ") || "",
    seniorities: persona.filters.seniorities?.join(", ") || "",
    industries: persona.filters.industries?.join(", ") || "",
    locations: persona.filters.locations?.join(", ") || "",
    companySize: persona.filters.companySize?.join(", ") || "",
    keywords: persona.filters.keywords || "",
  } : {
    name: "",
    description: "",
    titles: "",
    seniorities: "",
    industries: "",
    locations: "",
    companySize: "",
    keywords: "",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">
            {mode === "create" ? "Create Persona" : "Edit Persona"}
          </DialogTitle>
          <DialogDescription>
            Configure Apollo.io search filters to define your target audience.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Finance Elite"
                defaultValue={defaultValues.name}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Brief description of this persona..."
                defaultValue={defaultValues.description}
                maxLength={500}
                rows={2}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Apollo.io Filters</h4>
              <p className="text-xs text-muted-foreground">
                At least one filter is required
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="titles">Job Titles</Label>
              <Input
                id="titles"
                name="titles"
                placeholder="CEO, CFO, CTO (comma-separated)"
                defaultValue={defaultValues.titles}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of job titles
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seniorities">Seniority Levels</Label>
              <Input
                id="seniorities"
                name="seniorities"
                placeholder="c_suite, vp, director (comma-separated)"
                defaultValue={defaultValues.seniorities}
              />
              <p className="text-xs text-muted-foreground">
                Options: c_suite, vp, director, manager, senior, entry
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industries">Industries</Label>
              <Input
                id="industries"
                name="industries"
                placeholder="Financial Services, Technology (comma-separated)"
                defaultValue={defaultValues.industries}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of industries
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locations">Locations</Label>
              <Input
                id="locations"
                name="locations"
                placeholder="New York, San Francisco (comma-separated)"
                defaultValue={defaultValues.locations}
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated list of locations
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companySize">Company Size Ranges</Label>
              <Input
                id="companySize"
                name="companySize"
                placeholder="51-200, 201-500 (comma-separated)"
                defaultValue={defaultValues.companySize}
              />
              <p className="text-xs text-muted-foreground">
                Options: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001-10000, 10001+
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                name="keywords"
                placeholder="private equity venture capital"
                defaultValue={defaultValues.keywords}
              />
              <p className="text-xs text-muted-foreground">
                Free-form search keywords
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : mode === "create" ? "Create Persona" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
