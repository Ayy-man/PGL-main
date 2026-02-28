"use client";

import { ExternalLink } from "lucide-react";

interface ExaMention {
  title: string;
  snippet: string;
  url: string;
  publishedDate?: string;
}

interface InsiderTransaction {
  date: string;
  transactionType: string;
  shares: number;
  pricePerShare: number;
  totalValue: number;
}

interface ExaResult {
  mentions: ExaMention[];
  wealth_signals?: string[];
}

interface EdgarResult {
  transactions: InsiderTransaction[];
  total_value?: number;
}

interface WealthSignalsProps {
  webData?: ExaResult | null;
  insiderData?: EdgarResult | null;
}

/**
 * WealthSignals Component
 *
 * Displays wealth signals from enrichment sources:
 * - Web Mentions: Exa results with title, snippet, URL, date
 * - Insider Transactions: SEC Form 4 transactions (date, type, shares, value)
 *
 * Formats transaction values with currency formatting ($1,234,567).
 * Uses dark theme with gold accents for notable values.
 */
export function WealthSignals({ webData, insiderData }: WealthSignalsProps) {
  const hasMentions = webData?.mentions && webData.mentions.length > 0;
  const hasTransactions =
    insiderData?.transactions && insiderData.transactions.length > 0;
  const hasSignals = hasMentions || hasTransactions;

  if (!hasSignals) {
    return (
      <div className="surface-card rounded-[14px] p-6">
        <h3 className="mb-4 font-serif text-xl font-semibold text-foreground">
          Wealth Signals
        </h3>
        <p className="text-sm text-muted-foreground">
          No wealth signals found. Data will appear after enrichment.
        </p>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  return (
    <div className="surface-card rounded-[14px] p-6">
      <h3 className="mb-6 font-serif text-xl font-semibold text-foreground">
        Wealth Signals
      </h3>

      <div className="space-y-8">
        {/* Web Mentions */}
        {hasMentions && (
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Web Mentions
            </h4>
            <div className="space-y-4">
              {webData!.mentions.map((mention, index) => (
                <div
                  key={index}
                  className="surface-card rounded-[14px] p-4"
                >
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <h5 className="font-medium text-foreground">
                      {mention.title}
                    </h5>
                    {mention.publishedDate && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(mention.publishedDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="mb-3 text-sm text-muted-foreground">
                    {mention.snippet}
                  </p>
                  <a
                    href={mention.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gold hover:text-gold-muted transition-colors"
                  >
                    View Source
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Insider Transactions */}
        {hasTransactions && (
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Insider Transactions
            </h4>
            <div className="overflow-hidden rounded-md border">
              <table className="w-full">
                <thead className="bg-background">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Shares
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Total Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {insiderData!.transactions.map((tx, index) => (
                    <tr key={index} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                      <td className="px-4 py-3 text-sm text-foreground">
                        {new Date(tx.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {tx.transactionType}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-foreground">
                        {formatNumber(tx.shares)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-mono text-foreground">
                        {formatCurrency(tx.pricePerShare)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-mono font-semibold text-gold">
                        {formatCurrency(tx.totalValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {insiderData!.total_value && (
              <div className="mt-3 flex justify-end">
                <div className="text-sm">
                  <span className="text-muted-foreground">Total: </span>
                  <span className="font-mono font-semibold text-gold">
                    {formatCurrency(insiderData!.total_value)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
