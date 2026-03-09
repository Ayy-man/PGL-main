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
import { Checkbox } from "@/components/ui/checkbox";
import { TagInput } from "@/components/ui/tag-input";
import { createPersonaAction, updatePersonaAction } from "../actions";

/* ── Apollo API enum values ── */

const SENIORITY_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "founder", label: "Founder" },
  { value: "c_suite", label: "C-Suite" },
  { value: "partner", label: "Partner" },
  { value: "vp", label: "VP" },
  { value: "head", label: "Head" },
  { value: "director", label: "Director" },
  { value: "manager", label: "Manager" },
  { value: "senior", label: "Senior" },
  { value: "entry", label: "Entry" },
  { value: "intern", label: "Intern" },
] as const;

const COMPANY_SIZE_OPTIONS = [
  { value: "1,10", label: "1-10" },
  { value: "11,50", label: "11-50" },
  { value: "51,200", label: "51-200" },
  { value: "201,500", label: "201-500" },
  { value: "501,1000", label: "501-1,000" },
  { value: "1001,5000", label: "1,001-5,000" },
  { value: "5001,10000", label: "5,001-10,000" },
  { value: "10001,", label: "10,001+" },
] as const;

const INDUSTRY_SUGGESTIONS = [
  "Financial Services",
  "Banking",
  "Insurance",
  "Investment Management",
  "Private Equity",
  "Venture Capital",
  "Real Estate",
  "Technology",
  "Software",
  "Information Technology",
  "Healthcare",
  "Pharmaceuticals",
  "Biotechnology",
  "Manufacturing",
  "Retail",
  "E-Commerce",
  "Telecommunications",
  "Energy",
  "Oil & Gas",
  "Mining",
  "Construction",
  "Automotive",
  "Aerospace & Defense",
  "Media & Entertainment",
  "Hospitality",
  "Legal Services",
  "Consulting",
  "Education",
  "Government",
  "Nonprofit",
  "Transportation & Logistics",
];

const TITLE_SUGGESTIONS = [
  "CEO",
  "CFO",
  "CTO",
  "COO",
  "CIO",
  "CMO",
  "President",
  "Vice President",
  "Managing Director",
  "Partner",
  "Principal",
  "Director of Finance",
  "Director of Operations",
  "Head of Sales",
  "Head of Marketing",
  "General Counsel",
  "Board Member",
  "Founder",
  "Co-Founder",
  "Chairman",
];

interface PersonaFormDialogProps {
  mode: "create" | "edit";
  persona?: Persona;
  trigger: React.ReactNode;
}

export function PersonaFormDialog({ mode, persona, trigger }: PersonaFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Controlled state for multi-select & tag fields
  const [seniorities, setSeniorities] = useState<string[]>(
    persona?.filters.seniorities ?? []
  );
  const [companySizes, setCompanySizes] = useState<string[]>(
    persona?.filters.companySize ?? []
  );
  const [titles, setTitles] = useState<string[]>(
    persona?.filters.titles ?? []
  );
  const [industries, setIndustries] = useState<string[]>(
    persona?.filters.industries ?? []
  );
  const [locations, setLocations] = useState<string[]>(
    persona?.filters.locations ?? []
  );

  const toggleSeniority = (value: string) => {
    setSeniorities((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const toggleCompanySize = (value: string) => {
    setCompanySizes((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  const resetForm = () => {
    if (mode === "edit" && persona) {
      setSeniorities(persona.filters.seniorities ?? []);
      setCompanySizes(persona.filters.companySize ?? []);
      setTitles(persona.filters.titles ?? []);
      setIndustries(persona.filters.industries ?? []);
      setLocations(persona.filters.locations ?? []);
    } else {
      setSeniorities([]);
      setCompanySizes([]);
      setTitles([]);
      setIndustries([]);
      setLocations([]);
    }
    setError(null);
  };

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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) resetForm();
      }}
    >
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
          {/* ── Name & Description ── */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Finance Elite"
                defaultValue={persona?.name ?? ""}
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
                defaultValue={persona?.description ?? ""}
                maxLength={500}
                rows={2}
              />
            </div>
          </div>

          <Separator />

          {/* ── Apollo Filters ── */}
          <div className="space-y-5">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold">Apollo.io Filters</h4>
              <p className="text-xs text-muted-foreground">
                At least one filter is required
              </p>
            </div>

            {/* Job Titles — tag input with suggestions */}
            <div className="space-y-2">
              <Label>Job Titles</Label>
              <TagInput
                value={titles}
                onChange={setTitles}
                placeholder="Type a title and press Enter"
                suggestions={TITLE_SUGGESTIONS}
                name="titles"
              />
            </div>

            {/* Seniority Levels — checkbox grid */}
            <div className="space-y-2">
              <Label>Seniority Levels</Label>
              <input type="hidden" name="seniorities" value={seniorities.join(",")} />
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-4 gap-y-2">
                {SENIORITY_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={seniorities.includes(opt.value)}
                      onCheckedChange={() => toggleSeniority(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Industries — tag input with suggestions */}
            <div className="space-y-2">
              <Label>Industries</Label>
              <TagInput
                value={industries}
                onChange={setIndustries}
                placeholder="Type an industry and press Enter"
                suggestions={INDUSTRY_SUGGESTIONS}
                name="industries"
              />
            </div>

            {/* Locations — tag input */}
            <div className="space-y-2">
              <Label>Locations</Label>
              <TagInput
                value={locations}
                onChange={setLocations}
                placeholder="e.g., New York, London"
                name="locations"
              />
            </div>

            {/* Company Size — checkbox grid */}
            <div className="space-y-2">
              <Label>Company Size</Label>
              <input type="hidden" name="companySize" value={companySizes.join(",")} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
                {COMPANY_SIZE_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={companySizes.includes(opt.value)}
                      onCheckedChange={() => toggleCompanySize(opt.value)}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Keywords — plain text */}
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                name="keywords"
                placeholder="e.g., private equity, venture capital"
                defaultValue={persona?.filters.keywords ?? ""}
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
