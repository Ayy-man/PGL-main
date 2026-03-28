import type { UserRole } from './auth';
import type { PersonaFilters } from '@/lib/personas/types';

export type { PersonaFilters } from '@/lib/personas/types';

// Tenant table
export interface Tenant {
  id: string; // UUID
  name: string;
  slug: string;
  logo_url: string | null;
  theme: string; // theme key, default 'gold' — validated via isValidTheme()
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

// PersonaFilters is re-exported from @/lib/personas/types above

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
  enrichment_started_at: string | null;
  last_enriched_at: string | null;
  enrichment_source_status: Record<string, unknown> | null;
  inngest_event_id: string | null;
  // JSONB enrichment fields
  contact_data: ContactData | null;
  web_data: WebData | null;
  insider_data: InsiderData | null;
  ai_summary: string | null;
  // Company public market data
  publicly_traded_symbol: string | null;
  company_cik: string | null;
  // Stock market snapshot (manual fetch)
  stock_snapshot: StockSnapshot | null;
  stock_snapshot_at: string | null;
  // Intelligence dossier (Phase 23)
  intelligence_dossier: IntelligenceDossierData | null;
  dossier_generated_at: string | null;
  dossier_model: string | null;
  notes: string | null;
  // Manual override fields (display logic: manual_* ?? enriched_* ?? null)
  manual_display_name: string | null;
  manual_title: string | null;
  manual_company: string | null;
  manual_email: string | null;
  manual_email_secondary: string | null;
  manual_phone: string | null;
  manual_phone_label: string | null;
  manual_linkedin_url: string | null;
  manual_city: string | null;
  manual_state: string | null;
  manual_country: string | null;
  manual_wealth_tier: string | null;
  manual_photo_url: string | null;
  pinned_note: string | null;
  lead_owner_id: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Contact enrichment data (JSONB)
export interface ContactData {
  personal_email?: string;
  phone?: string;
  work_phone?: string;
  source?: string;
  enriched_at?: string;
  photo_url?: string;
}

// Web presence and wealth signals (JSONB)
export interface WebData {
  wealth_signals?: string[];
  linkedin_data?: Record<string, unknown>;
  news_mentions?: Array<{
    title: string;
    url: string;
    published_date: string;
  }>;
  source?: string;
  enriched_at?: string;
}

// SEC insider trading data (JSONB)
export interface InsiderData {
  trades?: Array<{
    date: string;
    type: string;
    shares: number;
    value: number;
    security: string;
  }>;
  total_value?: number;
  source?: string;
  enriched_at?: string;
}

// Stock market snapshot (JSONB)
export interface StockSnapshot {
  ticker: string;
  currentPrice: number;
  currency: string;
  fetchedAt: string; // ISO timestamp
  performance: {
    d7: number;  // 7-day % change
    d30: number; // 30-day % change
    d90: number; // 90-day % change
    y1: number;  // 1-year % change
  };
  sparkline: number[]; // last 90 trading days daily close prices
  equity: {
    estimatedShares: number;
    currentValue: number;
    gain90d: number; // dollar gain over 90 days
  } | null;
}

// Intelligence Dossier — structured AI-generated profile brief (JSONB)
export interface IntelligenceDossierData {
  summary: string;              // 2-3 sentences — why this person is a UHNWI buyer
  career_narrative: string;     // 2-3 sentences — career arc, current role context
  wealth_assessment: string;    // 2-3 sentences — signals indicating wealth level
  company_context: string;      // 2-3 sentences — company health, industry position
  outreach_hooks: string[];     // 3-5 bullet strings — specific conversation starters
  quick_facts: Array<{          // 4-6 key facts for fast scanning
    label: string;
    value: string;
  }>;
}

// Signal categories for prospect_signals table
export type SignalCategory =
  | "career_move"
  | "funding"
  | "media"
  | "wealth_signal"
  | "company_intel"
  | "recognition"
  | "sec_filing"
  | "market_event";

// prospect_signals table row
export interface ProspectSignal {
  id: string;
  prospect_id: string;
  tenant_id: string;
  category: SignalCategory;
  headline: string;
  summary: string;
  source_url: string | null;
  event_date: string | null;   // ISO date string
  raw_source: "exa" | "sec-edgar" | "market";
  is_new: boolean;
  created_at: string;
}

// signal_views table row — per-user seen tracking
export interface SignalView {
  id: string;
  signal_id: string;
  user_id: string;
  tenant_id: string;
  viewed_at: string;
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
  | 'lookalike_search'
  | 'profile_edited'
  | 'tag_added'
  | 'tag_removed'
  | 'photo_uploaded'
  | 'lead_owner_assigned';

// ─── Intelligence Dossier & Signal Timeline (Phase 23) ────────────────────────

export interface IntelligenceDossierData {
  summary: string;
  career_narrative: string;
  wealth_assessment: string;
  company_context: string;
  outreach_hooks: string[];
  quick_facts: Array<{ label: string; value: string }>;
}

export type SignalCategory =
  | "career_move"
  | "funding"
  | "media"
  | "wealth_signal"
  | "company_intel"
  | "recognition"
  | "sec_filing"
  | "market_event";

export interface ProspectSignal {
  id: string;
  prospect_id: string;
  tenant_id: string;
  category: SignalCategory;
  headline: string;
  summary: string;
  source_url: string | null;
  event_date: string | null;
  raw_source: "exa" | "sec-edgar" | "market";
  is_new: boolean;
  created_at: string;
}

export interface SignalView {
  id: string;
  signal_id: string;
  user_id: string;
  tenant_id: string;
  viewed_at: string;
}

// Usage Metrics Daily table
export interface UsageMetricsDaily {
  id: string;
  tenant_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  total_logins: number;
  searches_executed: number;
  profiles_viewed: number;
  profiles_enriched: number;
  csv_exports: number;
  lists_created: number;
  created_at: string;
  updated_at: string;
}
