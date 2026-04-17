"use client";

import { TrendingUp, Briefcase, Scale, Building2, Wallet } from "lucide-react";
import { useState } from "react";

interface SuggestedPersona {
  id: string;
  label: string;
  description: string;
  count: string;
  query: string;
  Icon: typeof TrendingUp;
  color: string;
}

const SUGGESTED: SuggestedPersona[] = [
  {
    id: "sugg-finance-elite",
    label: "Finance Elite",
    description: "MD+ at top investment banks",
    count: "~8,400 matches",
    query: "Managing Directors and above at Goldman Sachs, Morgan Stanley, JPMorgan, and other top investment banks",
    Icon: TrendingUp,
    color: "212,175,55",
  },
  {
    id: "sugg-tech-founders",
    label: "Tech Founders",
    description: "Series B+ founders with exits",
    count: "~3,200 matches",
    query: "Founders and CEOs of Series B or later tech startups, or founders with recent acquisition exits",
    Icon: Briefcase,
    color: "20,184,166",
  },
  {
    id: "sugg-biglaw",
    label: "BigLaw Partners",
    description: "Am Law 100 partners",
    count: "~1,900 matches",
    query: "Partners at Am Law 100 firms, equity partners with 10+ years tenure",
    Icon: Scale,
    color: "34,197,94",
  },
  {
    id: "sugg-realestate",
    label: "Real Estate Principals",
    description: "Family office + commercial RE",
    count: "~5,100 matches",
    query: "Principals and owners of commercial real estate firms and family-office-backed real estate holdings",
    Icon: Building2,
    color: "59,130,246",
  },
  {
    id: "sugg-family-office",
    label: "Family Office Managers",
    description: "Single & multi-family offices",
    count: "~2,700 matches",
    query: "Managing directors, CIOs, and principals at single-family and multi-family offices",
    Icon: Wallet,
    color: "168,85,247",
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
        border: `1px solid ${hovered ? "rgba(var(--gold-primary-rgb), 0.2)" : "rgba(255,255,255,0.06)"}`,
        background: hovered ? "var(--bg-elevated)" : "var(--bg-card-gradient)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hovered ? "0 6px 20px rgba(0,0,0,0.2)" : "none",
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
          style={{
            background: `rgba(${item.color},0.10)`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color: `rgba(${item.color},0.6)` }} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className="text-[14px] font-medium"
            style={{ color: "var(--text-primary-ds)" }}
          >
            {item.label}
          </span>
          <span
            className="text-[12px] font-light mt-0.5"
            style={{ color: "var(--text-secondary-ds)" }}
          >
            {item.description}
          </span>
        </div>
      </div>
      <span
        className="text-[11px] font-light"
        style={{ color: "var(--text-tertiary)" }}
      >
        {item.count}
      </span>
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
