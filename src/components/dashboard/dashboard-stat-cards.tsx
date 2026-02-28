import { Card, CardContent } from "@/components/ui/card";
import { FileDown, Download, Award } from "lucide-react";

interface DashboardStatCardsProps {
  totalExports: number;
  downloadsReady: number;
  enrichmentRate: number;
}

export function DashboardStatCards({
  totalExports,
  downloadsReady,
  enrichmentRate,
}: DashboardStatCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Total Exports */}
      <Card className="relative overflow-hidden">
        <CardContent className="pt-6">
          <FileDown
            className="h-12 w-12 absolute top-4 right-4"
            style={{ opacity: 0.1, color: "var(--gold-primary)" }}
          />
          <p
            className="text-[11px] font-semibold uppercase tracking-[1px]"
            style={{ color: "var(--gold-primary)" }}
          >
            TOTAL EXPORTS
          </p>
          <p
            className="font-serif text-5xl font-bold mt-3"
            style={{
              color:
                totalExports > 0
                  ? "var(--text-primary-ds)"
                  : "var(--text-secondary)",
            }}
          >
            {totalExports}
          </p>
          <p
            className="text-xs mt-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            Files generated this period
          </p>
        </CardContent>
      </Card>

      {/* Downloads Ready */}
      <Card className="relative overflow-hidden">
        <CardContent className="pt-6">
          <Download
            className="h-12 w-12 absolute top-4 right-4"
            style={{ opacity: 0.1, color: "var(--gold-primary)" }}
          />
          <p
            className="text-[11px] font-semibold uppercase tracking-[1px]"
            style={{ color: "var(--gold-primary)" }}
          >
            DOWNLOADS READY
          </p>
          <p
            className="font-serif text-5xl font-bold mt-3"
            style={{
              color:
                downloadsReady > 0
                  ? "var(--text-primary-ds)"
                  : "var(--text-secondary)",
            }}
          >
            {downloadsReady.toLocaleString()}
          </p>
          <p
            className="text-xs mt-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            Prospects across all lists
          </p>
        </CardContent>
      </Card>

      {/* Enrichment Rate */}
      <Card className="relative overflow-hidden">
        <CardContent className="pt-6">
          <Award
            className="h-12 w-12 absolute top-4 right-4"
            style={{ opacity: 0.1, color: "var(--gold-primary)" }}
          />
          <p
            className="text-[11px] font-semibold uppercase tracking-[1px]"
            style={{ color: "var(--gold-primary)" }}
          >
            ENRICHMENT RATE
          </p>
          <p
            className="font-serif text-5xl font-bold mt-3"
            style={{
              color:
                enrichmentRate > 0
                  ? "var(--text-primary-ds)"
                  : "var(--text-secondary)",
            }}
          >
            {enrichmentRate > 0 ? `${enrichmentRate}%` : "0%"}
          </p>
          <p
            className="text-xs mt-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            Profiles enriched vs. viewed
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
