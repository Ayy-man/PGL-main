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
import { useToast } from "@/hooks/use-toast";

export default function OrganizationSettingsPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [theme, setTheme] = useState("gold");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      }
      setLoading(false);
    }
    loadTenant();
  }, [orgId, router]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set("name", name);
    formData.set("slug", slug);
    formData.set("theme", theme);

    startTransition(async () => {
      const result = await updateTenantSettings(formData);
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Settings updated" });
        if (result.slug && result.slug !== orgId) {
          router.push(`/${result.slug}/settings/organization`);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  if (userRole !== "tenant_admin" && userRole !== "super_admin") {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight">
          Organization Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization&apos;s name, branding, and appearance
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
                }
                placeholder="your-org-slug"
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs: app.pgl.com/<strong>{slug || "slug"}</strong>
              </p>
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
            </div>
            <div className="space-y-2">
              <Label>Theme</Label>
              <ThemePicker value={theme} onChange={setTheme} />
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={isPending}
          className="bg-[var(--gold-primary)] text-black hover:bg-[var(--gold-bright)]"
        >
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
