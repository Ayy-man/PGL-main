export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background relative">
      <div className="ambient-glow-top" />
      <div className="ambient-glow-bottom" />

      {/* Brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-[480px] flex-col justify-between border-r border-border bg-card p-12">
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: "0ms" }}
        >
          <span className="font-serif text-xl font-bold tracking-tight text-gold">
            PGL
          </span>
        </div>
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4"
          style={{ animationDelay: "100ms" }}
        >
          <h2 className="font-serif text-[34px] font-semibold leading-[1.15] tracking-[-0.01em] text-foreground">
            Wealth Intelligence
            <br />
            <span className="text-gold mt-1 inline-block">for Luxury Real Estate</span>
          </h2>
          <p className="text-muted-foreground leading-relaxed max-w-sm">
            Find, enrich, and engage ultra-high-net-worth buyers
            with precision targeting.
          </p>
        </div>
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: "200ms" }}
        >
          <p className="text-xs text-muted-foreground tracking-wider uppercase">
            Phronesis Growth Labs
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center px-6 relative z-10">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
