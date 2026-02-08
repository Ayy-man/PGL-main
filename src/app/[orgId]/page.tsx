export default async function TenantDashboard({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  await params; // orgId validated by middleware, available via headers

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome to your workspace
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {["Total Prospects", "Active Lists", "Searches Today", "Team Members"].map((title) => (
          <div key={title} className="rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-2 text-2xl font-bold">--</p>
          </div>
        ))}
      </div>
    </div>
  );
}
