"use client";

import { createUserAction } from "@/app/admin/actions";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewUserPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("assistant");
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch tenants for the dropdown
    async function fetchTenants() {
      try {
        const response = await fetch("/api/admin/tenants");
        if (response.ok) {
          const data = await response.json();
          setTenants(data);
        }
      } catch (err) {
        console.error("Failed to fetch tenants:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchTenants();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createUserAction(formData);
      if (result.success) {
        router.push("/admin/users");
      } else {
        setError(result.error || "Failed to create user");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>
        <h1 className="font-serif text-3xl font-bold tracking-tight mt-4">
          Create User
        </h1>
        <p className="text-muted-foreground mt-1">
          Add a new user to the platform
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
            <label htmlFor="email" className="text-sm font-medium">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="user@example.com"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="full_name" className="text-sm font-medium">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              required
              placeholder="John Doe"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              required
              minLength={6}
              placeholder="Minimum 6 characters"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              Role <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              name="role"
              required
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="assistant">Assistant</option>
              <option value="agent">Agent</option>
              <option value="tenant_admin">Tenant Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          {selectedRole !== "super_admin" && (
            <div className="space-y-2">
              <label htmlFor="tenant_id" className="text-sm font-medium">
                Tenant <span className="text-red-500">*</span>
              </label>
              {loading ? (
                <div className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                  Loading tenants...
                </div>
              ) : (
                <select
                  id="tenant_id"
                  name="tenant_id"
                  required
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select a tenant</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isPending || loading}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Creating..." : "Create User"}
            </button>
            <Link
              href="/admin/users"
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
