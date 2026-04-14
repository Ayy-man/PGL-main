"use client";

import { inviteUser } from "@/app/actions/admin";
import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function NewUserPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("assistant");
  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [tenants, setTenants] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
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
    // Ensure controlled select values are included
    formData.set("role", selectedRole);
    if (selectedTenantId) formData.set("tenant_id", selectedTenantId);

    startTransition(async () => {
      try {
        await inviteUser(formData);
        toast({ title: "Invite sent", description: `Invitation sent to ${formData.get("email") as string}.` });
        router.push("/admin/users");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send invitation");
      }
    });
  };

  // Cmd/Ctrl+Enter shortcut
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Users", href: "/admin/users" },
          { label: "Invite" },
        ]}
      />

      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight mt-4">
          Invite User
        </h1>
        <p className="text-muted-foreground mt-1">
          Send an invitation to join the platform
        </p>
      </div>

      <div className="surface-card rounded-[14px] border border-[var(--border-default)] p-6 max-w-2xl">
        <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
          {error && (
            <div className="rounded-[8px] bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email <span className="text-destructive">*</span>
            </label>
            <Input
              type="email"
              id="email"
              name="email"
              required
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="full_name" className="text-sm font-medium">
              Full Name <span className="text-destructive">*</span>
            </label>
            <Input
              type="text"
              id="full_name"
              name="full_name"
              required
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="text-sm font-medium">
              Role <span className="text-destructive">*</span>
            </label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assistant">Assistant</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedRole !== "super_admin" && (
            <div className="space-y-2">
              <label htmlFor="tenant_id" className="text-sm font-medium">
                Tenant <span className="text-destructive">*</span>
              </label>
              {loading ? (
                <Skeleton className="h-9 w-full rounded-[8px]" />
              ) : (
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger id="tenant_id" className="w-full">
                    <SelectValue placeholder="Select a tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              variant="gold"
              disabled={isPending || loading}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isPending ? "Sending..." : "Send Invite"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/admin/users")}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: Press <kbd className="px-1 py-0.5 rounded text-[10px] bg-white/[0.06]">⌘ Enter</kbd> to submit
          </p>
        </form>
      </div>
    </div>
  );
}
