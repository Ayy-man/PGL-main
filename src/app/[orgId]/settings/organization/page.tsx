"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateTenantSettings } from "@/app/actions/tenant-settings";
import { ThemePicker } from "@/components/ui/theme-picker";
import { LogoUpload } from "@/components/ui/logo-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function OrganizationSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [theme, setTheme] = useState("gold");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Saved values for dirty detection
  const [savedName, setSavedName] = useState("");
  const [savedSlug, setSavedSlug] = useState("");
  const [savedTheme, setSavedTheme] = useState("gold");

  const dirty = name !== savedName || slug !== savedSlug || theme !== savedTheme;

  useEffect(() => {
    async function loadTenant() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const role = user.app_metadata?.role;
      setUserRole(role);

      if (role !== "tenant_admin" && role !== "super_admin") {
        router.push(`/${orgId}`);
        return;
      }

      const tId = user.app_metadata?.tenant_id;
      setTenantId(tId);

      const { data: tenant } = await supabase
        .from("tenants")
        .select("name, slug, theme, logo_url")
        .eq("id", tId)
        .single();

      if (tenant) {
        setName(tenant.name);
        setSlug(tenant.slug);
        setTheme(tenant.theme || "gold");
        setLogoUrl(tenant.logo_url);
        setSavedName(tenant.name);
        setSavedSlug(tenant.slug);
        setSavedTheme(tenant.theme || "gold");
      }
      setLoading(false);
    }
    loadTenant();
  }, [orgId, router]);

  // Beforeunload guard when form is dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function validateSlug(value: string) {
    const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
    if (value && !slugRegex.test(value)) {
      setSlugError("Slug must be lowercase letters, numbers, and hyphens only");
    } else {
      setSlugError(null);
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (slugError) return;
    const formData = new FormData();
    formData.set("name", name);
    formData.set("slug", slug);
    formData.set("theme", theme);

    startTransition(async () => {
      const result = await updateTenantSettings(formData);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        setSavedName(name);
        setSavedSlug(slug);
        setSavedTheme(theme);
        if (result.slug && result.slug !== orgId) {
          toast({
            title: "Settings updated",
            description: `Your workspace URL is now app.pgl.com/${result.slug}`,
          });
          router.push(`/${result.slug}/settings/organization`);
        } else {
          toast({ title: "Settings updated" });
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-[240px] rounded" />
        <Skeleton className="h-8 w-[280px] rounded-[8px]" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="surface-card rounded-[14px] p-6 space-y-4">
            <Skeleton className="h-5 w-[80px] rounded" />
            <Skeleton className="h-10 w-full rounded-[8px]" />
            <Skeleton className="h-10 w-full rounded-[8px]" />
            <Skeleton className="h-4 w-[200px] rounded" />
          </div>
          <div className="surface-card rounded-[14px] p-6 space-y-4">
            <Skeleton className="h-5 w-[80px] rounded" />
            <Skeleton className="h-16 w-16 rounded-lg" />
            <Skeleton className="h-10 w-full rounded-[8px]" />
          </div>
        </div>
      </div>
    );
  }

  if (userRole !== "tenant_admin" && userRole !== "super_admin") {
    return null;
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: `/${orgId}` },
          { label: "Settings", href: `/${orgId}/settings` },
          { label: "Organization" },
        ]}
      />

      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Organization Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization&apos;s name, branding, and appearance
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="space-y-1.5">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your organization name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="org-slug">URL Slug</Label>
              <Input
                id="org-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                onBlur={(e) => validateSlug(e.target.value)}
                placeholder="your-org-slug"
              />
              {slugError ? (
                <p className="text-xs text-destructive">{slugError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Used in URLs: app.pgl.com/<strong>{slug || "slug"}</strong>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-2">
              <Label>Logo</Label>
              {tenantId && (
                <LogoUpload
                  tenantId={tenantId}
                  currentUrl={logoUrl}
                  onUploaded={(url) => setLogoUrl(url)}
                />
              )}
              <p className="text-xs text-muted-foreground">Logo is saved immediately on upload.</p>
            </div>
            <div className="space-y-2">
              <Label>Theme</Label>
              <ThemePicker value={theme} onChange={setTheme} />
            </div>
          </CardContent>
        </Card>
        </div>

        <Button
          type="submit"
          disabled={isPending || !!slugError}
          variant="gold-solid"
          size="lg"
          className="gap-2"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {isPending ? "Saving" : "Save Changes"}
          {dirty && !isPending && (
            <span className="h-2 w-2 rounded-full bg-[var(--gold-primary)] ml-1" />
          )}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground mt-8">
        Need to delete this workspace?{" "}
        <a href="mailto:support@phronesis.dev" className="text-gold hover:underline">
          Contact support
        </a>
        .
      </p>
    </div>
  );
}
