"use client";

import { Briefcase, DollarSign, Mic2, Gem, Building2, Trophy, ExternalLink, Diamond, Landmark } from "lucide-react";

interface DigestedSignal {
  relevant: boolean;
  category: "career_move" | "funding" | "media" | "wealth_signal" | "company_intel" | "recognition";
  headline: string;
  summary: string;
  source_url: string;
  raw_text: string;
}

interface InsiderTransaction {
  date: string;
  transactionType: string;
  shares: number;
  pricePerShare: number;
  totalValue: number;
}

interface EdgarResult {
  transactions: InsiderTransaction[];
  total_value?: number;
}

interface WealthSignalsProps {
  webData?: {
    signals: DigestedSignal[];
    source?: string;
    enriched_at?: string;
  } | null;
  insiderData?: EdgarResult | null;
}

function getCategoryIcon(category: DigestedSignal["category"]) {
  switch (category) {
    case "career_move": return Briefcase;
    case "funding": return DollarSign;
    case "media": return Mic2;
    case "wealth_signal": return Gem;
    case "company_intel": return Building2;
    case "recognition": return Trophy;
    default: return Diamond;
  }
}

function getCategoryLabel(category: DigestedSignal["category"]): string {
  switch (category) {
    case "career_move": return "Career Move";
    case "funding": return "Funding";
    case "media": return "Media";
    case "wealth_signal": return "Wealth Signal";
    case "company_intel": return "Company Intel";
    case "recognition": return "Recognition";
    default: return "Signal";
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getTransactionColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("purchase") || t.includes("buy"))
    return "var(--success, #22c55e)";
  if (t.includes("sale") || t.includes("sell"))
    return "var(--destructive, #ef4444)";
  return "var(--text-muted, rgba(255,255,255,0.25))";
}

/**
 * WealthSignals — Center column intelligence section for the prospect dossier.
 *
 * Matches the stitch mockup "Wealth Signals & Intelligence" section:
 * - Diamond icon + header + subtitle
 * - 2-col grid of digested signal cards (category icon, category pill, bold headline, summary, source link)
 * - SEC Filings table below with transaction types colored
 */
export function WealthSignals({ webData, insiderData }: WealthSignalsProps) {
  const hasSignals = webData?.signals && webData.signals.length > 0;
  const hasTransactions =
    insiderData?.transactions && insiderData.transactions.length > 0;
  const hasAny = hasSignals || hasTransactions;

  return (
    <div className="surface-card rounded-[14px] p-6 flex-1">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h3 className="text-foreground text-xl font-bold font-serif flex items-center gap-2">
            <Diamond
              className="h-5 w-5 shrink-0"
              style={{ color: "var(--gold-primary)" }}
            />
            Wealth Signals &amp; Intelligence
          </h3>
          <p className="text-xs text-muted-foreground ml-7 mt-0.5">
            Aggregated from SEC, Real Estate Records, &amp; Exa
          </p>
        </div>
      </div>

      {!hasAny && (
        <p className="text-sm text-muted-foreground">
          No wealth signals found. Data will appear after enrichment.
        </p>
      )}

      {/* Digested Signal Cards — 2-col grid */}
      {hasSignals && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {webData!.signals.map((signal, index) => {
            const isWide =
              webData!.signals.length % 2 !== 0 &&
              index === webData!.signals.length - 1;
            const CategoryIcon = getCategoryIcon(signal.category);
            return (
              <div
                key={index}
                className={`rounded-[8px] p-4 flex flex-col h-full transition-all${isWide ? " md:col-span-2" : ""}`}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border:
                    "1px solid var(--border-default, rgba(255,255,255,0.06))",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    "rgba(212,175,55,0.2)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    "var(--border-default, rgba(255,255,255,0.06))";
                }}
              >
                {/* Category icon + pill */}
                <div className="flex items-center gap-2 mb-3">
                  <CategoryIcon
                    className="h-4 w-4 shrink-0"
                    style={{ color: "var(--gold-muted)" }}
                  />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                    style={{
                      background: "rgba(212,175,55,0.08)",
                      color: "var(--gold-primary)",
                      border: "1px solid rgba(212,175,55,0.15)",
                    }}
                  >
                    {getCategoryLabel(signal.category)}
                  </span>
                </div>
                {/* Headline */}
                <h4 className="text-sm font-bold text-foreground mb-2 font-serif">
                  {signal.headline}
                </h4>
                {/* Summary */}
                <p className="text-xs text-muted-foreground mb-4 flex-1 leading-relaxed">
                  {signal.summary}
                </p>
                {/* Source link */}
                <a
                  href={signal.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] flex items-center gap-1 mt-auto transition-colors cursor-pointer"
                  style={{ color: "var(--gold-primary)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color =
                      "var(--gold-muted)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.color =
                      "var(--gold-primary)";
                  }}
                >
                  View Source{" "}
                  <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* SEC Filings Table */}
      {hasTransactions && (
        <div
          className="pt-6"
          style={{
            borderTop: hasSignals
              ? "1px solid var(--border-default, rgba(255,255,255,0.06))"
              : "none",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground text-base font-bold font-serif flex items-center gap-2">
              <Landmark
                className="h-4 w-4 shrink-0"
                style={{ color: "var(--success, #22c55e)" }}
              />
              SEC Filings (Public Exec)
            </h3>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
              style={{
                background: "rgba(34,197,94,0.1)",
                color: "var(--success, #22c55e)",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >
              Insider Activity
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead
                className="text-muted-foreground font-medium"
                style={{
                  borderBottom:
                    "1px solid var(--border-default, rgba(255,255,255,0.06))",
                }}
              >
                <tr>
                  <th className="pb-2 pl-1 font-serif font-medium">Date</th>
                  <th className="pb-2 font-serif font-medium">Type</th>
                  <th className="pb-2 font-serif font-medium text-right">
                    Shares
                  </th>
                  <th className="pb-2 font-serif font-medium text-right">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody>
                {insiderData!.transactions.slice(0, 5).map((tx, index) => (
                  <tr
                    key={index}
                    className="transition-colors"
                    style={{
                      borderBottom:
                        index < insiderData!.transactions.length - 1
                          ? "1px solid rgba(255,255,255,0.03)"
                          : "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        "rgba(255,255,255,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.background =
                        "transparent";
                    }}
                  >
                    <td className="py-3 pl-1 text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3">
                      <span
                        className="inline-flex items-center gap-1 font-bold text-xs"
                        style={{ color: getTransactionColor(tx.transactionType) }}
                      >
                        {tx.transactionType}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono text-foreground">
                      {formatNumber(tx.shares)}
                    </td>
                    <td
                      className="py-3 text-right font-medium font-mono"
                      style={{ color: "var(--gold-primary)" }}
                    >
                      {formatCurrency(tx.totalValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {insiderData!.total_value != null && insiderData!.total_value > 0 && (
            <div className="mt-3 flex justify-end">
              <div className="text-sm">
                <span className="text-muted-foreground">Total: </span>
                <span
                  className="font-mono font-semibold"
                  style={{ color: "var(--gold-primary)" }}
                >
                  {formatCurrency(insiderData!.total_value)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
