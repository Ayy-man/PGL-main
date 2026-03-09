interface TenantLogoProps {
  logoUrl: string | null;
  tenantName: string;
  className?: string;
}

export function TenantLogo({ logoUrl, tenantName, className }: TenantLogoProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${tenantName} logo`}
        className={className || "h-8 w-auto"}
      />
    );
  }

  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15 text-gold font-serif font-bold text-sm ring-1 ring-gold/20 ${className || ""}`}
    >
      {tenantName.charAt(0).toUpperCase()}
    </div>
  );
}
