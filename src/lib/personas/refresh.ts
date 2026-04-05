import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonaFilters } from "@/lib/personas/types";
import type { ApolloSearchParams } from "@/lib/apollo/types";
import { translateFiltersToApolloParams } from "@/lib/apollo/client";
import { apolloBreaker } from "@/lib/circuit-breaker/apollo-breaker";

const MAX_PAGES_PER_REFRESH = 5;
const PER_PAGE = 100;

export interface RefreshResult {
  newProspects: number;
  existingActive: number;
  existingEnriched: number;
  totalDismissed: number;
  resurfaced: number;
  totalFromApollo: number;
}

export async function refreshSavedSearchProspects(params: {
  searchId: string;
  tenantId: string;
  filters: PersonaFilters;
  supabase: SupabaseClient;
}): Promise<RefreshResult> {
  const { searchId, tenantId, filters, supabase } = params;
  const now = new Date().toISOString();

  // a. Fetch Apollo results with pagination cap (max 5 pages × 100 = 500 results)
  const translatedParams = translateFiltersToApolloParams(filters);
  const allApolloResults: Array<{
    id: string;
    first_name: string;
    last_name_obfuscated?: string;
    title?: string;
    organization?: { name?: string };
    organization_name?: string;
  }> = [];
  let totalEntries = 0;

  for (let page = 1; page <= MAX_PAGES_PER_REFRESH; page++) {
    const apolloParams: ApolloSearchParams = {
      ...translatedParams,
      page,
      per_page: PER_PAGE,
    };

    const response = await apolloBreaker.fire(apolloParams);
    const people = response.people || [];

    if (page === 1) {
      totalEntries = response.total_entries ?? response.pagination?.total_entries ?? people.length;
    }

    allApolloResults.push(...people);

    // Break early if Apollo returned fewer than PER_PAGE results (last page)
    if (people.length < PER_PAGE) {
      break;
    }
  }

  // Deduplicate by apollo_person_id — Apollo can return the same person across pages
  const seenIds = new Set<string>();
  const deduped = allApolloResults.filter((p) => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  // f. Edge case — empty Apollo results: do NOT clear existing rows
  if (deduped.length === 0) {
    await supabase
      .from("personas")
      .update({ last_refreshed_at: now, total_apollo_results: 0 })
      .eq("id", searchId);

    // Count existing rows for result
    const { data: existingRows } = await supabase
      .from("saved_search_prospects")
      .select("status")
      .eq("saved_search_id", searchId);

    const rows = existingRows ?? [];
    return {
      newProspects: 0,
      existingActive: rows.filter((r) => r.status === "active").length,
      existingEnriched: rows.filter((r) => r.status === "enriched").length,
      totalDismissed: rows.filter((r) => r.status === "dismissed").length,
      resurfaced: 0,
      totalFromApollo: 0,
    };
  }

  // b. Fetch all existing rows from saved_search_prospects
  const { data: existingRows } = await supabase
    .from("saved_search_prospects")
    .select("*")
    .eq("saved_search_id", searchId);

  const existingMap = new Map<string, {
    id: string;
    apollo_person_id: string;
    status: string;
    apollo_data: Record<string, unknown>;
    first_seen_at: string;
  }>();

  for (const row of existingRows ?? []) {
    existingMap.set(row.apollo_person_id, row);
  }

  // c. Build upsert rows
  const upsertRows: Array<Record<string, unknown>> = [];
  let newProspects = 0;
  let existingActive = 0;
  let existingEnriched = 0;
  let totalDismissed = 0;
  let resurfaced = 0;

  for (const p of deduped) {
    const orgName = (p.organization as { name?: string } | undefined)?.name ?? p.organization_name ?? "";
    const existing = existingMap.get(p.id);

    const apolloData = {
      first_name: p.first_name,
      last_name: p.last_name_obfuscated ?? "",
      name: `${p.first_name} ${p.last_name_obfuscated ?? ""}`.trim(),
      title: p.title ?? "",
      organization_name: orgName,
      organization: { name: orgName },
    };

    if (!existing) {
      // New prospect
      newProspects++;
      upsertRows.push({
        saved_search_id: searchId,
        tenant_id: tenantId,
        apollo_person_id: p.id,
        apollo_data: apolloData,
        status: "active",
        is_new: true,
        first_seen_at: now,
        last_seen_at: now,
      });
    } else if (existing.status === "dismissed") {
      // Check for job/company changes
      const storedData = existing.apollo_data as Record<string, unknown>;
      const storedTitle = (storedData.title as string | undefined) ?? "";
      const storedOrgName =
        ((storedData.organization as { name?: string } | undefined)?.name) ??
        (storedData.organization_name as string | undefined) ??
        "";

      const freshTitle = p.title ?? "";
      const jobChanged = storedTitle !== freshTitle;
      const companyChanged = storedOrgName !== orgName;

      if (jobChanged || companyChanged) {
        // Resurface: job or company changed
        resurfaced++;
        totalDismissed--; // Will be counted as active below
        upsertRows.push({
          saved_search_id: searchId,
          tenant_id: tenantId,
          apollo_person_id: p.id,
          apollo_data: apolloData,
          status: "active",
          is_new: true,
          dismissed_at: null,
          dismissed_by: null,
          last_seen_at: now,
        });
      } else {
        // Stay dismissed — only update last_seen_at and apollo_data
        totalDismissed++;
        upsertRows.push({
          saved_search_id: searchId,
          tenant_id: tenantId,
          apollo_person_id: p.id,
          apollo_data: apolloData,
          status: "dismissed",
          is_new: false,
          last_seen_at: now,
        });
      }
    } else if (existing.status === "active") {
      existingActive++;
      upsertRows.push({
        saved_search_id: searchId,
        tenant_id: tenantId,
        apollo_person_id: p.id,
        apollo_data: apolloData,
        status: "active",
        is_new: false,
        last_seen_at: now,
      });
    } else if (existing.status === "enriched") {
      existingEnriched++;
      upsertRows.push({
        saved_search_id: searchId,
        tenant_id: tenantId,
        apollo_person_id: p.id,
        apollo_data: apolloData,
        status: "enriched",
        is_new: false,
        last_seen_at: now,
      });
    }
  }

  // d. Batch upsert (split to preserve first_seen_at on existing rows)
  const newRows = upsertRows.filter((r) => "first_seen_at" in r);
  const existingUpsertRows = upsertRows.filter((r) => !("first_seen_at" in r));

  if (newRows.length > 0) {
    const { error: insertError } = await supabase
      .from("saved_search_prospects")
      .upsert(newRows, { onConflict: "saved_search_id,apollo_person_id" });
    if (insertError) {
      console.error("[refresh] Failed to upsert new rows:", insertError.message);
      throw new Error(`Failed to insert new prospects: ${insertError.message}`);
    }
  }

  if (existingUpsertRows.length > 0) {
    const { error: updateError } = await supabase
      .from("saved_search_prospects")
      .upsert(existingUpsertRows, { onConflict: "saved_search_id,apollo_person_id" });
    if (updateError) {
      console.error("[refresh] Failed to upsert existing rows:", updateError.message);
      throw new Error(`Failed to update existing prospects: ${updateError.message}`);
    }
  }

  // e. Update personas table
  await supabase
    .from("personas")
    .update({ last_refreshed_at: now, total_apollo_results: totalEntries })
    .eq("id", searchId);

  // g. Return RefreshResult
  return {
    newProspects,
    existingActive,
    existingEnriched,
    totalDismissed: totalDismissed < 0 ? 0 : totalDismissed,
    resurfaced,
    totalFromApollo: deduped.length,
  };
}
