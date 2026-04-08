"use client";

import { useState } from "react";
import { TrendingUp, Briefcase, Scale, Building2, Wallet } from "lucide-react";

interface SuggestedPersona {
  id: string;
  label: string;
  description: string;
  count: string;
  query: string;
  Icon: typeof TrendingUp;
}

const SUGGESTED: SuggestedPersona[] = [
  {
    id: "sugg-finance-elite",
    label: "Finance Elite",
    description: "MD+ at top investment banks",
    count: "~8,400 prospects",
    query:
      "Managing Directors and above at Goldman Sachs, Morgan Stanley, JPMorgan, and other top investment banks",
    Icon: TrendingUp,
  },
  {
    id: "sugg-tech-founders",
    label: "Tech Founders",
    description: "Series B+ founders with exits",
    count: "~3,200 prospects",
    query:
      "Founders and CEOs of Series B or later tech startups, or founders with recent acquisition exits",
    Icon: Briefcase,
  },
  {
    id: "sugg-biglaw",
    label: "BigLaw Partners",
    description: "Am Law 100 partners",
    count: "~1,900 prospects",
    query:
      "Partners at Am Law 100 firms — equity partners with 10+ years tenure",
    Icon: Scale,
  },
  {
    id: "sugg-realestate",
    label: "Real Estate Principals",
    description: "Family office + commercial RE",
    count: "~5,100 prospects",
    query:
      "Principals and owners of commercial real estate firms and family-office-backed real estate holdings",
    Icon: Building2,
  },
  {
    id: "sugg-family-office",
    label: "Family Office Managers",
    description: "Single & multi-family offices",
    count: "~2,700 prospects",
    query:
      "Managing directors, CIOs, and principals at single-family and multi-family offices",
    Icon: Wallet,
  },
];

interface SuggestedPersonasSectionProps {
  onPrefillSearch: (query: string) => void;
}

function SuggestedCard({
  item,
  onPrefill,
}: {
  item: SuggestedPersona;
  onPrefill: (q: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { Icon } = item;
  return (
    <button
      type="button"
      onClick={() => onPrefill(item.query)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left w-full rounded-[14px] p-4 cursor-pointer transition-all duration-150"
      style={{
        border: `1px solid ${hovered ? "var(--border-gold)" : "var(--border-subtle)"}`,
        background: hovered ? "var(--gold-bg)" : "var(--bg-elevated)",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      <div className="flex items-start gap-3 mb-2">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
          style={{
            background: "var(--gold-bg)",
            border: "1px solid var(--border-gold)",
          }}
        >
          <Icon className="h-4 w-4" style={{ color: "var(--gold-primary)" }} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className="text-[14px] font-medium"
            style={{ color: "var(--text-primary-ds)" }}
          >
            {item.label}
          </span>
          <span
            className="text-[12px] font-light truncate"
            style={{ color: "var(--text-secondary-ds)" }}
          >
            {item.description}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span
          className="text-[11px] uppercase tracking-wider whitespace-nowrap"
          style={{ color: "var(--text-tertiary)" }}
        >
          {item.count}
        </span>
        <span
          className="text-[12px] font-medium shrink-0"
          style={{ color: "var(--gold-primary)" }}
        >
          Try this →
        </span>
      </div>
    </button>
  );
}

export function SuggestedPersonasSection({ onPrefillSearch }: SuggestedPersonasSectionProps) {
  return (
    <section className="mt-10">
      <p
        className="text-[13px] uppercase tracking-wider font-medium mb-4"
        style={{ color: "var(--text-tertiary)" }}
      >
        Suggested Searches
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SUGGESTED.map((item) => (
          <SuggestedCard key={item.id} item={item} onPrefill={onPrefillSearch} />
        ))}
      </div>
    </section>
  );
}
