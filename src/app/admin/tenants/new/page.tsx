"use client";

import { createTenant } from "@/app/actions/admin";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ThemePicker } from "@/components/ui/theme-picker";
import { Input } from "@/components/ui/input";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Confirmation,
  ConfirmationIcon,
  ConfirmationTitle,
  ConfirmationDescription,
} from "@/components/ui/confirmation";
import { useToast } from "@/hooks/use-toast";

export default function NewTenantPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState("gold");
  const { toast } = useToast();

  // Form field state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState("");

  // Unsaved changes guard
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const isDirty = name.trim() !== "" || slug.trim() !== "" || adminEmail.trim() !== "";

  // Auto-derive slug from name when not manually overridden
  useEffect(() => {
    if (!slugDirty) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  }, [name, slugDirty]);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlugDirty(true);
    setSlug(e.target.value);
    setSlugError(null);
  };

  const handleSlugBlur = () => {
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      setSlugError("Use only lowercase letters, numbers, and hyphens");
    } else {
      setSlugError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validate slug before submit
    if (slug && !/^[a-z0-9-]+$/.test(slug)) {
      setSlugError("Use only lowercase letters, numbers, and hyphens");
      return;
    }

    const formData = new FormData(e.currentTarget);
    // Ensure derived slug is included
    formData.set("slug", slug);

    startTransition(async () => {
      try {
        const result = await createTenant(formData);
        const adminEmailVal = formData.get("admin_email") as string;

        if (result.warning) {
          toast({
            title: "Tenant created",
            description: result.warning,
          });
        } else if (adminEmailVal) {
          toast({
            title: "Tenant created",
            description: `Invite sent to ${adminEmailVal}.`,
          });
        } else {
          toast({ title: "Tenant created" });
        }
        router.push("/admin/tenants");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create tenant");
      }
    });
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      router.push("/admin/tenants");
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Tenants", href: "/admin/tenants" },
          { label: "Create" },
        ]}
      />

      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight mt-4">
          Create Tenant
        </h1>
        <p className="text-muted-foreground mt-1">
          Add a new real estate team to the platform
        </p>
      </div>

      <div className="surface-card rounded-[14px] border border-[var(--border-default)] p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-[8px] bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Tenant Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              id="name"
              name="name"
              required
              placeholder="Acme Real Estate"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="slug" className="text-sm font-medium">
              Slug <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              id="slug"
              name="slug"
              required
              placeholder="acme-real-estate"
              value={slug}
              onChange={handleSlugChange}
              onBlur={handleSlugBlur}
              aria-invalid={!!slugError}
              aria-describedby={slugError ? "slug-error" : "slug-hint"}
            />
            {slugError ? (
              <p id="slug-error" className="text-xs text-destructive">
                {slugError}
              </p>
            ) : (
              <p id="slug-hint" className="text-xs text-muted-foreground">
                URL-safe identifier (lowercase, numbers, and hyphens only)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="admin_email" className="text-sm font-medium">
              Admin Email
            </label>
            <Input
              type="email"
              id="admin_email"
              name="admin_email"
              placeholder="admin@acme-realestate.com"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Send an invite to the tenant&apos;s first admin
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Brand Theme</label>
            <ThemePicker value={theme} onChange={setTheme} />
            <input type="hidden" name="theme" value={theme} />
            <p className="text-xs text-muted-foreground">
              This theme colors the tenant&apos;s sidebar, buttons, and accents.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              disabled={isPending}
              variant="gold"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPending ? "Creating..." : "Create Tenant"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelClick}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* Unsaved-changes guard */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent>
          <Confirmation
            isDestructive
            confirmLabel="Discard changes"
            cancelLabel="Keep editing"
            onConfirm={() => router.push("/admin/tenants")}
            onCancel={() => setShowDiscardDialog(false)}
          >
            <ConfirmationIcon variant="destructive" />
            <ConfirmationTitle>Discard this new tenant?</ConfirmationTitle>
            <ConfirmationDescription>
              Any information you&apos;ve entered will be lost. This cannot be undone.
            </ConfirmationDescription>
          </Confirmation>
        </DialogContent>
      </Dialog>
    </div>
  );
}
