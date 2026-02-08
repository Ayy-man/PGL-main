import type { UserRole } from './auth';

// Tenant table
export interface Tenant {
  id: string; // UUID
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string; // hex color, default '#d4af37'
  secondary_color: string; // hex color, default '#f4d47f'
  is_active: boolean;
  created_at: string; // ISO timestamp
  updated_at: string;
}

// User table (maps to auth.users + public.users)
export interface User {
  id: string; // UUID, matches auth.users.id
  tenant_id: string | null; // null for super_admin
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Persona table
export interface Persona {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  filters: PersonaFilters;
  is_starter: boolean;
  created_by: string; // user id
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonaFilters {
  job_titles?: string[];
  seniority_levels?: string[];
  industries?: string[];
  locations?: string[];
  company_size_ranges?: string[];
  keywords?: string[];
}

// Prospect table
export interface Prospect {
  id: string;
  tenant_id: string;
  apollo_id: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  work_email: string | null;
  work_phone: string | null;
  personal_email: string | null;
  personal_phone: string | null;
  linkedin_url: string | null;
  enrichment_status: EnrichmentStatus;
  enriched_at: string | null;
  created_at: string;
  updated_at: string;
}

export type EnrichmentStatus = 'none' | 'pending' | 'in_progress' | 'complete' | 'failed';

// SEC Transaction table
export interface SecTransaction {
  id: string;
  prospect_id: string;
  tenant_id: string;
  transaction_date: string;
  security_title: string;
  transaction_type: string; // 'purchase' | 'sale' | 'exercise'
  transaction_shares: number;
  price_per_share: number;
  transaction_value: number;
  filing_url: string | null;
  created_at: string;
}

// Prospect Summary table (AI-generated)
export interface ProspectSummary {
  id: string;
  prospect_id: string;
  tenant_id: string;
  summary_text: string;
  generated_at: string;
  model_used: string; // e.g. 'claude-3-haiku'
  token_count: number;
  created_at: string;
}

// List table
export interface List {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  created_by: string; // user id
  member_count: number;
  created_at: string;
  updated_at: string;
}

// List Member table (junction)
export interface ListMember {
  id: string;
  list_id: string;
  prospect_id: string;
  tenant_id: string;
  status: ListMemberStatus;
  notes: string | null;
  added_by: string; // user id
  created_at: string;
  updated_at: string;
}

export type ListMemberStatus = 'new' | 'contacted' | 'responded' | 'not_interested';

// Activity Log table
export interface ActivityLog {
  id: string;
  tenant_id: string;
  user_id: string;
  action_type: ActivityActionType;
  target_type: 'prospect' | 'list' | 'persona' | 'user' | 'tenant' | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export type ActivityActionType =
  | 'login'
  | 'search_executed'
  | 'profile_viewed'
  | 'profile_enriched'
  | 'add_to_list'
  | 'remove_from_list'
  | 'status_updated'
  | 'note_added'
  | 'csv_exported'
  | 'persona_created'
  | 'lookalike_search';

// Usage Metrics Daily table
export interface UsageMetricsDaily {
  id: string;
  tenant_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  logins: number;
  searches: number;
  profiles_viewed: number;
  profiles_enriched: number;
  csv_exports: number;
  lists_created: number;
  created_at: string;
  updated_at: string;
}
