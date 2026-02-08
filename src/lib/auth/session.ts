import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { SessionUser } from "@/types/auth";
import type { UserRole } from "@/types/auth";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  const role = (user.app_metadata?.role as UserRole) || 'assistant';
  const tenantId = user.app_metadata?.tenant_id as string | null;

  return {
    id: user.id,
    email: user.email!,
    role,
    tenantId: tenantId || null,
    fullName: user.user_metadata?.full_name || user.email!,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireTenantUser(orgId: string): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role === 'super_admin') return user;
  if (user.tenantId !== orgId) {
    redirect("/login");
  }
  return user;
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
