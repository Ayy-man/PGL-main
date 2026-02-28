interface StatPillsProps {
  totals: {
    totalLogins: number;
    searchesExecuted: number;
    profilesViewed: number;
    profilesEnriched: number;
    csvExports: number;
    listsCreated: number;
  };
}

const STAT_ITEMS: { key: keyof StatPillsProps["totals"]; label: string }[] = [
  { key: "searchesExecuted", label: "Searches" },
  { key: "profilesViewed", label: "Profiles Viewed" },
  { key: "profilesEnriched", label: "Enrichments" },
  { key: "csvExports", label: "Exports" },
  { key: "listsCreated", label: "Lists" },
];

export function StatPills({ totals }: StatPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {STAT_ITEMS.map(({ key, label }) => (
        <div
          key={label}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-secondary)",
          }}
        >
          <span className="font-mono" style={{ color: "var(--gold-primary)" }}>
            {totals[key].toLocaleString()}
          </span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
