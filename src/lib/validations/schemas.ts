import { z } from "zod";

export const uuidSchema = z.string().uuid("Invalid UUID format");
export const emailSchema = z.string().email("Invalid email address").toLowerCase();

export const tenantSlugSchema = z
  .string()
  .min(2, "Slug must be at least 2 characters")
  .max(50, "Slug must be at most 50 characters")
  .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "Slug must be lowercase alphanumeric with hyphens");

export const createTenantSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: tenantSlugSchema,
  logo_url: z.string().url().nullable().optional(),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be hex color").default("#d4af37"),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be hex color").default("#f4d47f"),
});

export const inviteUserSchema = z.object({
  email: emailSchema,
  full_name: z.string().min(1, "Name is required").max(100),
  role: z.enum(["tenant_admin", "agent", "assistant"]),
  tenant_id: uuidSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const searchSchema = z.object({
  query: z.string().max(200).optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
