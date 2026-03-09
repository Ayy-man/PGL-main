export type UserRole = 'super_admin' | 'tenant_admin' | 'agent' | 'assistant';

// Role hierarchy for comparison (higher number = more privileges)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  assistant: 0,
  agent: 1,
  tenant_admin: 2,
  super_admin: 3,
};

// Permissions matrix
export const ROLE_PERMISSIONS: Record<UserRole, {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageUsers: boolean;
  canManageTenants: boolean;
  canAccessAdmin: boolean;
}> = {
  assistant: {
    canView: true,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canManageUsers: false,
    canManageTenants: false,
    canAccessAdmin: false,
  },
  agent: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canManageUsers: false,
    canManageTenants: false,
    canAccessAdmin: false,
  },
  tenant_admin: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canManageUsers: true,
    canManageTenants: false,
    canAccessAdmin: false,
  },
  super_admin: {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canManageUsers: true,
    canManageTenants: true,
    canAccessAdmin: true,
  },
};

// Session user with tenant context
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string | null; // null for super_admin
  fullName: string;
}

// JWT custom claims shape
export interface CustomClaims {
  user_role: UserRole;
  tenant_id: string | null;
}

// Helper type guard
export function isValidRole(role: string): role is UserRole {
  return ['super_admin', 'tenant_admin', 'agent', 'assistant'].includes(role);
}

export function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
