"use client";

interface Transaction {
  date: string;
  transactionType: string;
  shares: number;
  pricePerShare: number;
  totalValue: number;
}

interface SECFilingsTableProps {
  transactions: Transaction[];
  totalValue?: number;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

function getTypePillClass(transactionType: string): string {
  const type = transactionType.toLowerCase();
  if (type.includes("purchase") || type === "p") {
    return "bg-success-muted text-success border border-success/30";
  }
  if (type.includes("sale") || type === "s") {
    return "bg-destructive/15 text-destructive border border-destructive/30";
  }
  // Grant or Other
  return "bg-info-muted text-info border border-info/30";
}

function formatTransactionLabel(transactionType: string): string {
  const type = transactionType.toLowerCase();
  if (type === "p" || type.includes("purchase")) return "Purchase";
  if (type === "s" || type.includes("sale")) return "Sale";
  if (type === "a" || type.includes("grant")) return "Grant";
  return transactionType;
}

export function SECFilingsTable({ transactions, totalValue }: SECFilingsTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border py-12">
        <p className="text-sm text-muted-foreground">No SEC filings found</p>
      </div>
    );
  }

  const computedTotal =
    totalValue ?? transactions.reduce((sum, tx) => sum + tx.totalValue, 0);

  return (
    <div className="overflow-hidden rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="bg-background">
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
              Price/Share
            </th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Value
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.map((tx, i) => (
            <tr
              key={i}
              className="hover:bg-[rgba(255,255,255,0.02)] transition-colors"
            >
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                {tx.date}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getTypePillClass(tx.transactionType)}`}
                >
                  {formatTransactionLabel(tx.transactionType)}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-sm text-foreground">
                {tx.shares.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right">
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: "var(--gold-primary)" }}
                >
                  {formatCurrency(tx.pricePerShare)}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: "var(--gold-primary)" }}
                >
                  {formatCurrency(tx.totalValue)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-background">
            <td
              colSpan={4}
              className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Total
            </td>
            <td className="px-4 py-3 text-right">
              <span
                className="font-mono text-sm font-semibold"
                style={{ color: "var(--gold-primary)" }}
              >
                {formatCurrency(computedTotal)}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
