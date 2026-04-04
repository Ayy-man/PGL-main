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

  const updateData = {
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
  };

  // 1. Try to find existing prospect by dedup key
  let existing: { id: string } | null = null;

  if (input.work_email) {
    const { data } = await supabase
      .from("prospects")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("work_email", input.work_email)
      .limit(1)
      .maybeSingle();
    existing = data;
  }

  if (!existing && input.linkedin_url) {
    const { data } = await supabase
      .from("prospects")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("linkedin_url", input.linkedin_url)
      .limit(1)
      .maybeSingle();
    existing = data;
  }

  if (!existing && input.apollo_id) {
    const { data } = await supabase
      .from("prospects")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("apollo_id", input.apollo_id)
      .limit(1)
      .maybeSingle();
    existing = data;
  }

  // 2. Update existing or insert new
  if (existing) {
    const { data, error } = await supabase
      .from("prospects")
      .update(updateData)
      .eq("id", existing.id)
      .select(PROSPECT_SELECT)
      .single();

    if (error) {
      throw new Error(`Failed to update prospect: ${error.message}`);
    }
    return data as Prospect;
  }

  // 3. Insert new prospect
  const { data, error } = await supabase
    .from("prospects")
    .insert({
      tenant_id: tenantId,
      ...updateData,
      work_email: input.work_email,
    })
    .select(PROSPECT_SELECT)
    .single();

  if (error) {
    throw new Error(`Failed to insert prospect: ${error.message}`);
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
  } else if (input.apollo_id) {
    query = query.eq("apollo_id", input.apollo_id);
  } else {
    throw new Error("Cannot resolve duplicate: no work_email, linkedin_url, or apollo_id");
  }

  const { data: existing, error: selectError } = await query.limit(1).maybeSingle();
  if (selectError || !existing) {
    // No existing record found — do a plain insert instead of updating
    if (!existing && !selectError) {
      const { data: inserted, error: insertError } = await supabase
        .from("prospects")
        .insert({
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
        })
        .select(PROSPECT_SELECT)
        .single();
      if (insertError) {
        throw new Error(`Fallback insert failed: ${insertError.message}`);
      }
      return inserted as Prospect;
    }
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

  const firstName = person.first_name || person.name?.split(" ")[0] || "Unknown";
  const lastName = person.last_name || person.name?.split(" ").slice(1).join(" ") || "Unknown";

  const input: UpsertProspectInput = {
    apollo_id: person.id,
    first_name: firstName,
    last_name: lastName,
    title: person.title || null,
    company: person.organization_name || null,
    location,
    work_email: person.email || null,
    work_phone: workPhone,
    personal_email: null, // Not available from Apollo
    personal_phone: null, // Not available from Apollo
    linkedin_url: person.linkedin_url || null,
  };

  const result = await upsertProspect(tenantId, input);

  // Persist Apollo photo_url into contact_data JSONB if available
  if (person.photo_url) {
    const adminClient = createAdminClient();
    const { data: existing } = await adminClient
      .from("prospects")
      .select("contact_data")
      .eq("id", result.id)
      .single();
    const existingData =
      (existing?.contact_data as Record<string, unknown>) || {};
    await adminClient
      .from("prospects")
      .update({
        contact_data: { ...existingData, photo_url: person.photo_url },
      })
      .eq("id", result.id);
  }

  return result;
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
