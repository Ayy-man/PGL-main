export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-[480px] flex-col justify-between border-r border-border bg-card p-12">
        <div>
          <span className="font-serif text-xl font-bold tracking-tight text-gold">
            PGL
          </span>
        </div>
        <div className="space-y-4">
          <h2 className="font-serif text-3xl font-bold leading-tight tracking-tight text-foreground">
            Wealth Intelligence
            <br />
            <span className="text-gold">for Luxury Real Estate</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-sm">
            Find, enrich, and engage ultra-high-net-worth buyers
            with precision targeting.
          </p>
        </div>
        <p className="text-xs text-muted-foreground tracking-wider uppercase">
          Phronesis Growth Labs
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
