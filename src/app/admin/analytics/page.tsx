import { ComingSoonCard } from "@/components/admin/coming-soon-card";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Platform Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Cross-tenant usage metrics and platform insights
        </p>
      </div>

      <ComingSoonCard label="Coming Soon">
        <div className="surface-admin-card rounded-[14px] p-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl border bg-card"
                style={{ borderColor: "var(--admin-row-border)" }}
              />
            ))}
          </div>
          <div
            className="mt-6 h-[300px] rounded-xl border bg-card"
            style={{ borderColor: "var(--admin-row-border)" }}
          />
        </div>
      </ComingSoonCard>
    </div>
  );
}
