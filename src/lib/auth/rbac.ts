import { redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import {
  type UserRole,
  type SessionUser,
  hasMinRole,
  ROLE_PERMISSIONS,
} from "@/types/auth";

export async function requireRole(minimumRole: UserRole): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (!hasMinRole(user.role, minimumRole)) {
    if (user.tenantId) {
      redirect(`/${user.tenantId}`);
    }
    redirect("/login");
  }
  return user;
}

export function checkPermission(
  user: SessionUser,
  permission: keyof typeof ROLE_PERMISSIONS.assistant
): boolean {
  return ROLE_PERMISSIONS[user.role][permission];
}

export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'super_admin') {
    redirect("/login");
  }
  return user;
}
