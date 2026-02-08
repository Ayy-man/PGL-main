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
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-serif font-bold text-sm ${className || ""}`}
    >
      {tenantName.charAt(0).toUpperCase()}
    </div>
  );
}
