import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Prospect, UpsertProspectInput } from "./types";
import type { ApolloPerson } from "@/lib/apollo/types";

const PROSPECT_SELECT = `
  id,
  tenant_id,
  apollo_id,
  first_name,
  last_name,
  full_name,
  title,
  company,
  location,
  work_email,
  work_phone,
  personal_email,
  personal_phone,
  linkedin_url,
  enrichment_status,
  enriched_at,
  created_at,
  updated_at
`;

/**
 * Upsert a prospect with deduplication.
 *
 * Uses the admin client (bypasses RLS) to avoid conflict detection issues
 * when concurrent upserts race on the same unique constraint.
 *
 * Deduplication strategy:
 * 1. If work_email exists: deduplicate by (tenant_id, work_email)
 * 2. If work_email is null but linkedin_url exists: deduplicate by (tenant_id, linkedin_url)
 * 3. If neither exists: just insert (no dedup possible)
 *
 * On conflict: updates all mutable fields to latest data.
 */
export async function upsertProspect(
  tenantId: string,
  input: UpsertProspectInput
): Promise<Prospect> {
  const supabase = createAdminClient();

  const insertData = {
    tenant_id: tenantId,
    apollo_id: input.apollo_id,
    first_name: input.first_name,
    last_name: input.last_name,
    title: input.title,
    company: input.company,
    location: input.location,
    work_email: input.work_email,
    work_phone: input.work_phone,
    personal_email: input.personal_email,
    personal_phone: input.personal_phone,
    linkedin_url: input.linkedin_url,
  };

  // Determine which unique constraint to use for deduplication
  let onConflict: string | undefined;
  if (input.work_email) {
    onConflict = "tenant_id,work_email";
  } else if (input.linkedin_url) {
    onConflict = "tenant_id,linkedin_url";
  }
  // If neither, onConflict is undefined -> regular insert

  const { data, error } = await supabase
    .from("prospects")
    .upsert(insertData, {
      onConflict: onConflict,
      ignoreDuplicates: false, // Update on conflict
    })
    .select(PROSPECT_SELECT)
    .single();

  if (error) {
    // Handle race condition: if unique constraint still fires (concurrent requests),
    // fall back to finding the existing record and updating it.
    // Check both error code and message — Supabase/PostgREST may format differently.
    const isDuplicate =
      error.code === "23505" ||
      error.message?.includes("duplicate key") ||
      error.message?.includes("unique constraint");
    if (isDuplicate) {
      console.warn(`[upsertProspect] Unique constraint race — falling back to select+update for ${input.work_email || input.linkedin_url}`);
      return upsertProspectFallback(supabase, tenantId, input);
    }
    throw new Error(`Failed to upsert prospect: ${error.message}`);
  }

  return data as Prospect;
}

/**
 * Fallback for when concurrent upserts race on the same unique key.
 * Finds the existing record and updates it.
 */
async function upsertProspectFallback(
  supabase: ReturnType<typeof createAdminClient>,
  tenantId: string,
  input: UpsertProspectInput
): Promise<Prospect> {
  // Find the existing prospect by whichever unique key we have
  let query = supabase
    .from("prospects")
    .select(PROSPECT_SELECT)
    .eq("tenant_id", tenantId);

  if (input.work_email) {
    query = query.eq("work_email", input.work_email);
  } else if (input.linkedin_url) {
    query = query.eq("linkedin_url", input.linkedin_url);
  } else {
    throw new Error("Cannot resolve duplicate: no work_email or linkedin_url");
  }

  const { data: existing, error: selectError } = await query.single();
  if (selectError || !existing) {
    throw new Error(`Fallback select failed: ${selectError?.message || "not found"}`);
  }

  // Update the existing record with fresh data
  const { data: updated, error: updateError } = await supabase
    .from("prospects")
    .update({
      apollo_id: input.apollo_id,
      first_name: input.first_name,
      last_name: input.last_name,
      title: input.title,
      company: input.company,
      location: input.location,
      work_phone: input.work_phone,
      personal_email: input.personal_email,
      personal_phone: input.personal_phone,
      linkedin_url: input.linkedin_url,
    })
    .eq("id", existing.id)
    .select(PROSPECT_SELECT)
    .single();

  if (updateError) {
    throw new Error(`Fallback update failed: ${updateError.message}`);
  }

  return updated as Prospect;
}

/**
 * Map Apollo API person to UpsertProspectInput and upsert.
 */
export async function upsertProspectFromApollo(
  tenantId: string,
  person: ApolloPerson
): Promise<Prospect> {
  // Build location string from city, state, country
  const locationParts = [person.city, person.state, person.country].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : null;

  // Extract first phone number if available
  const workPhone =
    person.phone_numbers && person.phone_numbers.length > 0
      ? person.phone_numbers[0].sanitized_number || person.phone_numbers[0].raw_number
      : null;

  const input: UpsertProspectInput = {
    apollo_id: person.id,
    first_name: person.first_name,
    last_name: person.last_name,
    title: person.title || null,
    company: person.organization_name || null,
    location,
    work_email: person.email || null,
    work_phone: workPhone,
    personal_email: null, // Not available from Apollo
    personal_phone: null, // Not available from Apollo
    linkedin_url: person.linkedin_url || null,
  };

  return upsertProspect(tenantId, input);
}

/**
 * Get a prospect by ID.
 */
export async function getProspectById(
  id: string,
  tenantId: string
): Promise<Prospect | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("prospects")
    .select(`
      id,
      tenant_id,
      apollo_id,
      first_name,
      last_name,
      full_name,
      title,
      company,
      location,
      work_email,
      work_phone,
      personal_email,
      personal_phone,
      linkedin_url,
      enrichment_status,
      enriched_at,
      created_at,
      updated_at
    `)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null; // Not found
    }
    throw new Error(`Failed to fetch prospect: ${error.message}`);
  }

  return data as Prospect;
}
