"use client";

import { createTenantAction } from "@/app/admin/actions";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewTenantPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createTenantAction(formData);
      if (result.success) {
        router.push("/admin/tenants");
      } else {
        setError(result.error || "Failed to create tenant");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/tenants"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </Link>
        <h1 className="font-serif text-3xl font-bold tracking-tight mt-4">
          Create Tenant
        </h1>
        <p className="text-muted-foreground mt-1">
          Add a new real estate team to the platform
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Tenant Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder="Acme Real Estate"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="slug" className="text-sm font-medium">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              required
              placeholder="acme-real-estate"
              pattern="[a-z0-9-]+"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              URL-safe identifier (lowercase, numbers, and hyphens only)
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="logo_url" className="text-sm font-medium">
              Logo URL
            </label>
            <input
              type="url"
              id="logo_url"
              name="logo_url"
              placeholder="https://example.com/logo.png"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="primary_color" className="text-sm font-medium">
                Primary Color
              </label>
              <input
                type="text"
                id="primary_color"
                name="primary_color"
                defaultValue="#d4af37"
                placeholder="#d4af37"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="secondary_color" className="text-sm font-medium">
                Secondary Color
              </label>
              <input
                type="text"
                id="secondary_color"
                name="secondary_color"
                defaultValue="#f4d47f"
                placeholder="#f4d47f"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Creating..." : "Create Tenant"}
            </button>
            <Link
              href="/admin/tenants"
              className="inline-flex h-10 items-center justify-center rounded-md border border-border px-6 text-sm font-medium hover:bg-accent"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
