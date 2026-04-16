/**
 * Prospect types for database operations and API responses.
 */

/**
 * Full prospect record from database.
 * Aligns with prospects table schema.
 */
export interface Prospect {
  id: string;
  tenant_id: string;
  apollo_id: string | null;
  first_name: string;
  last_name: string;
  full_name: string; // Generated column: first_name || ' ' || last_name
  title: string | null;
  company: string | null;
  location: string | null;
  work_email: string | null;
  work_phone: string | null;
  personal_email: string | null;
  personal_phone: string | null;
  linkedin_url: string | null;
  enrichment_status: "none" | "pending" | "in_progress" | "complete" | "failed";
  enriched_at: string | null;
  created_at: string;
  updated_at: string;
  // Manual override fields
  manual_display_name?: string | null;
  manual_title?: string | null;
  manual_company?: string | null;
  manual_email?: string | null;
  manual_email_secondary?: string | null;
  manual_phone?: string | null;
  manual_phone_label?: string | null;
  manual_linkedin_url?: string | null;
  manual_city?: string | null;
  manual_state?: string | null;
  manual_country?: string | null;
  manual_wealth_tier?: string | null;
  // Auto-estimated wealth tier (Phase 43)
  auto_wealth_tier?: string | null;
  auto_wealth_tier_confidence?: string | null;
  auto_wealth_tier_reasoning?: string | null;
  auto_wealth_tier_estimated_at?: string | null;
  manual_photo_url?: string | null;
  pinned_note?: string | null;
  lead_owner_id?: string | null;
  updated_by?: string | null;
}

/**
 * Input for upserting a prospect.
 * Excludes auto-generated and system-managed fields.
 */
export interface UpsertProspectInput {
  apollo_id: string | null;
  first_name: string;
  last_name: string;
  title: string | null;
  company: string | null;
  location: string | null;
  work_email: string | null;
  work_phone: string | null;
  personal_email: string | null;
  personal_phone: string | null;
  linkedin_url: string | null;
}
