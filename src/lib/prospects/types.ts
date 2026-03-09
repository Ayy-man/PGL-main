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
