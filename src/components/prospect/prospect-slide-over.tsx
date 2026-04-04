"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Mail, Phone, X, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";

interface Prospect {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  work_email: string | null;
  phone: string | null;
  _enriched: boolean;
}

interface ProspectSlideOverProps {
  open: boolean;
  onClose: () => void;
  prospectId: string | null;
  prospect?: Prospect | null;
  orgId?: string;
}

export function ProspectSlideOver({
  open,
  onClose,
  prospectId,
  prospect,
  orgId,
}: ProspectSlideOverProps) {
  const initials = prospect
    ? `${prospect.first_name?.[0] ?? ""}${prospect.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  const isEnriched = prospect?._enriched === true;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        style={{
          width: "min(480px, 90vw)",
          background: "#0d0d10",
          borderLeft: "1px solid rgba(212,175,55,0.1)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
        }}
        className="p-0 overflow-y-auto"
      >
        {/* Panel Header (sticky) */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-7 py-5"
          style={{ background: "#0d0d10" }}
        >
          <button
            onClick={onClose}
            aria-label="Close prospect panel"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted transition-colors hover:bg-accent cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {isEnriched && prospect && orgId && prospectId ? (
            <Link
              href={`/${orgId}/prospects/${prospectId}`}
              className="cursor-pointer text-sm transition-colors hover:text-[var(--gold-muted)]"
              style={{ color: "var(--gold-primary)" }}
            >
              View Full Profile
            </Link>
          ) : null}
        </div>

        {/* Panel Body */}
        {prospect ? (
          <div className="px-7 space-y-6 pb-10">
            {/* Identity Block */}
            <div className="flex flex-col gap-4">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-border text-sm font-semibold text-foreground"
                  style={{ background: "var(--bg-card)" }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="font-serif text-xl sm:text-[24px] font-semibold text-foreground leading-tight">
                    {prospect.full_name}
                  </h2>
                </div>
              </div>

              {/* Contact action buttons — enriched only */}
              {isEnriched && (
                <div className="flex items-center gap-3">
                  {prospect.work_email && (
                    <a
                      href={`mailto:${prospect.work_email}`}
                      aria-label="Send email"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                  {prospect.phone && (
                    <a
                      href={`tel:${prospect.phone}`}
                      aria-label="Call prospect"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {isEnriched ? (
              /* Enriched state: 4-cell grid */
              <div
                className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-border"
                style={{ background: "var(--bg-card-gradient)" }}
              >
                {/* Title */}
                <div className="border-b border-r border-border p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Title
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {prospect.title ?? "—"}
                  </p>
                </div>
                {/* Company */}
                <div className="border-b border-border p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Company
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {prospect.company ?? "—"}
                  </p>
                </div>
                {/* Location */}
                <div className="border-r border-border p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Location
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {prospect.location ?? "—"}
                  </p>
                </div>
                {/* Email */}
                <div className="p-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Email
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-foreground">
                    {prospect.work_email ?? "—"}
                  </p>
                </div>
              </div>
            ) : (
              /* Preview state: 2-cell grid + Enrich CTA */
              <>
                <div
                  className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-border"
                  style={{ background: "var(--bg-card-gradient)" }}
                >
                  {/* Title */}
                  <div className="border-r border-border p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Title
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {prospect.title ?? "—"}
                    </p>
                  </div>
                  {/* Company */}
                  <div className="p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Company
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {prospect.company ?? "—"}
                    </p>
                  </div>
                </div>

                {/* Enrich & Save CTA */}
                <div
                  className="rounded-[10px] border p-5 space-y-3"
                  style={{
                    borderColor: "rgba(212,175,55,0.3)",
                    background: "rgba(212,175,55,0.04)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles
                      className="h-4 w-4 shrink-0"
                      style={{ color: "var(--gold-primary)" }}
                    />
                    <span
                      className="text-sm font-semibold"
                      style={{ color: "var(--gold-primary)" }}
                    >
                      Enrich & Save
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Enriching this prospect unlocks their full contact data,
                    intelligence dossier, and wealth signals.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Select this prospect in the table and click{" "}
                    <span className="font-medium text-foreground">
                      Enrich Selection
                    </span>{" "}
                    to get started.
                  </p>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Loading / empty state */
          <div className="flex flex-col items-center justify-center px-7 py-20 text-center">
            <Loader2
              className="mb-4 h-8 w-8 animate-spin"
              style={{ color: "var(--gold-muted)" }}
            />
            <p className="text-sm text-muted-foreground">
              Loading prospect details...
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
