"use client";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Mail, Phone, X, Sparkles, Loader2, RefreshCw, ListPlus, ExternalLink, Shield } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

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

/** Enriched data fetched from Supabase via GET /api/prospects/[id] */
interface EnrichedData {
  work_email: string | null;
  personal_email: string | null;
  work_phone: string | null;
  personal_phone: string | null;
  linkedin_url: string | null;
  location: string | null;
  title: string | null;
  company: string | null;
  enrichment_status: string | null;
  manual_wealth_tier: string | null;
  contact_data: { phone?: string; personal_email?: string; work_phone?: string } | null;
  intelligence_dossier: { summary?: string; outreach_hooks?: string[] } | null;
}

interface ProspectSlideOverProps {
  open: boolean;
  onClose: () => void;
  prospectId: string | null;
  prospect?: Prospect | null;
  orgId?: string;
  onEnrich?: (prospectId: string) => void;
  onAddToList?: (prospectId: string) => void;
  fromQuery?: string;
}

export function ProspectSlideOver({
  open,
  onClose,
  prospectId,
  prospect,
  orgId,
  onEnrich,
  onAddToList,
  fromQuery = "?from=search",
}: ProspectSlideOverProps) {
  const [reEnriching, setReEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedData | null>(null);
  const [loadingEnriched, setLoadingEnriched] = useState(false);
  const { toast } = useToast();

  const isEnriched = prospect?._enriched === true;

  // Fetch enriched data from Supabase when slide-over opens for an enriched prospect
  useEffect(() => {
    if (!open || !prospectId || !isEnriched) {
      setEnrichedData(null);
      return;
    }

    let cancelled = false;
    setLoadingEnriched(true);

    fetch(`/api/prospects/${prospectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setEnrichedData(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingEnriched(false);
      });

    return () => { cancelled = true; };
  }, [open, prospectId, isEnriched]);

  const handleReEnrich = async () => {
    if (!prospectId || reEnriching) return;
    setReEnriching(true);
    try {
      const res = await fetch(`/api/prospects/${prospectId}/enrich?force=true`, { method: "POST" });
      if (res.ok) {
        toast({ title: "Re-enrichment queued", description: "Data will refresh in the background." });
      } else {
        toast({ title: "Re-enrichment failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Re-enrichment failed", variant: "destructive" });
    }
    setTimeout(() => setReEnriching(false), 2000);
  };

  const initials = prospect
    ? `${prospect.first_name?.[0] ?? ""}${prospect.last_name?.[0] ?? ""}`.toUpperCase()
    : "?";

  // Merge enriched data over Apollo preview data
  const displayEmail = enrichedData?.work_email || enrichedData?.personal_email || prospect?.work_email || null;
  const displayPhone = enrichedData?.contact_data?.phone || enrichedData?.work_phone || prospect?.phone || null;
  const displayLocation = enrichedData?.location || prospect?.location || null;
  const displayTitle = enrichedData?.title || prospect?.title || null;
  const displayCompany = enrichedData?.company || prospect?.company || null;
  const displayLinkedin = enrichedData?.linkedin_url || null;
  const displayWealthTier = enrichedData?.manual_wealth_tier || null;
  const dossierSummary = enrichedData?.intelligence_dossier?.summary || null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        style={{
          width: "min(480px, 90vw)",
          background: "#0d0d10",
          borderLeft: isEnriched
            ? "1px solid rgba(212,175,55,0.35)"
            : "1px solid rgba(212,175,55,0.1)",
          boxShadow: isEnriched
            ? "-20px 0 60px rgba(212,175,55,0.08), -4px 0 20px rgba(0,0,0,0.5)"
            : "-20px 0 60px rgba(0,0,0,0.5)",
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

          {/* Enriched badge */}
          {isEnriched && (
            <span
              className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
              style={{
                borderColor: "rgba(212,175,55,0.3)",
                background: "rgba(212,175,55,0.08)",
                color: "var(--gold-primary)",
              }}
            >
              <Shield className="h-3 w-3" />
              Enriched
            </span>
          )}
        </div>

        {/* Panel Body */}
        {prospect ? (
          <div className="px-7 space-y-6 pb-10">
            {/* Identity Block */}
            <div className="flex flex-col gap-4">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold text-foreground"
                  style={{
                    background: "var(--bg-card)",
                    borderColor: isEnriched ? "rgba(212,175,55,0.4)" : "var(--border)",
                  }}
                >
                  {initials}
                </div>
                <div className="min-w-0">
                  <h2 className="font-serif text-xl sm:text-[24px] font-semibold text-foreground leading-tight">
                    {prospect.full_name}
                  </h2>
                  {displayWealthTier && (
                    <p
                      className="mt-0.5 text-xs font-medium"
                      style={{ color: "var(--gold-primary)" }}
                    >
                      {displayWealthTier}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact action buttons — enriched only */}
              {isEnriched && (
                <div className="flex items-center gap-3">
                  {displayEmail && (
                    <a
                      href={`mailto:${displayEmail}`}
                      aria-label="Send email"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                  {displayPhone && (
                    <a
                      href={`tel:${displayPhone}`}
                      aria-label="Call prospect"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                  {displayLinkedin && (
                    <a
                      href={displayLinkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="View LinkedIn"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {isEnriched ? (
              /* Enriched state: 6-cell grid with enriched data + dossier snippet */
              <>
                {loadingEnriched && !enrichedData ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--gold-muted)" }} />
                  </div>
                ) : (
                  <>
                    <div
                      className="grid grid-cols-2 overflow-hidden rounded-[10px] border"
                      style={{
                        borderColor: "rgba(212,175,55,0.2)",
                        background: "var(--bg-card-gradient)",
                      }}
                    >
                      {/* Title */}
                      <div className="border-b border-r border-border p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Title
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {displayTitle ?? "\u2014"}
                        </p>
                      </div>
                      {/* Company */}
                      <div className="border-b border-border p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Company
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {displayCompany ?? "\u2014"}
                        </p>
                      </div>
                      {/* Location */}
                      <div className="border-b border-r border-border p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Location
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {displayLocation ?? "\u2014"}
                        </p>
                      </div>
                      {/* Email */}
                      <div className="border-b border-border p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Email
                        </p>
                        <p className="mt-1 truncate text-sm font-medium text-foreground">
                          {displayEmail ?? "\u2014"}
                        </p>
                      </div>
                      {/* Phone */}
                      <div className="border-r border-border p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          Phone
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {displayPhone ?? "\u2014"}
                        </p>
                      </div>
                      {/* LinkedIn */}
                      <div className="p-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          LinkedIn
                        </p>
                        {displayLinkedin ? (
                          <a
                            href={displayLinkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 block truncate text-sm font-medium transition-colors hover:underline"
                            style={{ color: "var(--gold-primary)" }}
                          >
                            {displayLinkedin.replace(/^https?:\/\/(www\.)?linkedin\.com/, "linkedin.com")}
                          </a>
                        ) : (
                          <p className="mt-1 text-sm font-medium text-foreground">{"\u2014"}</p>
                        )}
                      </div>
                    </div>

                    {/* Dossier snippet */}
                    {dossierSummary && (
                      <div
                        className="rounded-[10px] border p-4"
                        style={{
                          borderColor: "rgba(212,175,55,0.15)",
                          background: "rgba(212,175,55,0.03)",
                        }}
                      >
                        <p
                          className="mb-2 text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "var(--gold-primary)" }}
                        >
                          Intelligence Brief
                        </p>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {dossierSummary}
                        </p>
                      </div>
                    )}
                  </>
                )}

                <div className="flex items-center gap-4">
                  {onAddToList && (
                    <button
                      onClick={() => onAddToList(prospect.id)}
                      className="flex items-center gap-2 text-xs transition-colors"
                      style={{ color: "var(--gold-primary)" }}
                    >
                      <ListPlus className="h-3 w-3" />
                      Add to List
                    </button>
                  )}
                  <button
                    onClick={handleReEnrich}
                    disabled={reEnriching}
                    className="flex items-center gap-2 text-xs transition-colors disabled:opacity-50"
                    style={{ color: "var(--text-tertiary, rgba(232,228,220,0.4))" }}
                  >
                    {reEnriching
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <RefreshCw className="h-3 w-3" />}
                    {reEnriching ? "Re-enriching\u2026" : "Re-enrich"}
                  </button>
                </div>

                {/* View Full Profile — full-width gold button at bottom */}
                {orgId && prospectId && (
                  <Link
                    href={`/${orgId}/prospects/${prospectId}${fromQuery}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition-colors cursor-pointer hover:brightness-110"
                    style={{
                      borderColor: "rgba(212,175,55,0.4)",
                      background: "rgba(212,175,55,0.12)",
                      color: "var(--gold-primary)",
                    }}
                  >
                    View Full Profile
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </>
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
                      {prospect.title ?? "\u2014"}
                    </p>
                  </div>
                  {/* Company */}
                  <div className="p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Company
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {prospect.company ?? "\u2014"}
                    </p>
                  </div>
                </div>

                {/* Enrich & Save CTA */}
                <div
                  className="rounded-[10px] border p-5 space-y-4"
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
                    Unlock full contact data, intelligence dossier, and wealth
                    signals for this prospect.
                  </p>
                  <button
                    onClick={() => onEnrich?.(prospect.id)}
                    className="w-full rounded-lg border py-2.5 text-sm font-medium transition-colors cursor-pointer hover:brightness-110"
                    style={{
                      borderColor: "rgba(212,175,55,0.4)",
                      background: "rgba(212,175,55,0.12)",
                      color: "var(--gold-primary)",
                    }}
                  >
                    Enrich This Prospect
                  </button>
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
