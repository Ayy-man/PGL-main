import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonaFilters } from "@/lib/personas/types";
import type { ApolloSearchParams } from "@/lib/apollo/types";
import { translateFiltersToApolloParams } from "@/lib/apollo/client";
import { apolloBreaker } from "@/lib/circuit-breaker/apollo-breaker";

const PAGES_PER_REFRESH = 5;
const PER_PAGE = 100;
// Apollo API hard cap — page * per_page cannot exceed 50,000.
const MAX_APOLLO_PAGE = 500;

export interface RefreshResult {
  newProspects: number;
  existingActive: number;
  existingEnriched: number;
  totalDismissed: number;
  resurfaced: number;
  totalFromApollo: number;
  apolloPagesFetched: number;
}

type ApolloPreview = {
  id: string;
  first_name: string;
  last_name_obfuscated?: string;
  title?: string;
  organization?: { name?: string };
  organization_name?: string;
};

/**
 * Fetches a contiguous page range from Apollo and upserts into saved_search_prospects.
 * Shared by refresh (pages 1..N) and extend (pages N+1..N+5).
 */
async function fetchAndUpsertApolloRange(params: {
  searchId: string;
  tenantId: string;
  filters: PersonaFilters;
  supabase: SupabaseClient;
  startPage: number;
  endPage: number;
  /** If true, also writes total_apollo_results and last_refreshed_at. Refresh = true, extend = false. */
  updateRefreshTimestamp: boolean;
  /** Existing apollo_pages_fetched value — final value will be max(this, endPage). */
  previousPagesFetched: number;
}): Promise<RefreshResult> {
  const { searchId, tenantId, filters, supabase, startPage, updateRefreshTimestamp, previousPagesFetched } = params;
  const endPage = Math.min(params.endPage, MAX_APOLLO_PAGE);
  const now = new Date().toISOString();

  const translatedParams = translateFiltersToApolloParams(filters);
  const allApolloResults: ApolloPreview[] = [];
  let totalEntries = 0;
  let lastPageReached = startPage - 1;

  for (let page = startPage; page <= endPage; page++) {
    const apolloParams: ApolloSearchParams = {
      ...translatedParams,
      page,
      per_page: PER_PAGE,
    };

    const response = await apolloBreaker.fire(apolloParams);
    const people = (response.people || []) as ApolloPreview[];

    if (page === startPage) {
      totalEntries = response.total_entries ?? response.pagination?.total_entries ?? people.length;
    }

    allApolloResults.push(...people);
    lastPageReached = page;

    // Break early if Apollo returned fewer than PER_PAGE results (last page)
    if (people.length < PER_PAGE) {
      break;
    }
  }

  // Deduplicate by apollo_person_id
  const seenIds = new Set<string>();
  const deduped = allApolloResults.filter((p) => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  const newApolloPagesFetched = Math.max(previousPagesFetched, lastPageReached);

  // Edge case — empty Apollo results: do NOT clear existing rows
  if (deduped.length === 0) {
    const personaUpdate: Record<string, unknown> = {
      apollo_pages_fetched: newApolloPagesFetched,
    };
    if (updateRefreshTimestamp) {
      personaUpdate.last_refreshed_at = now;
      personaUpdate.total_apollo_results = 0;
    }
    await supabase.from("personas").update(personaUpdate).eq("id", searchId);

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
      apolloPagesFetched: newApolloPagesFetched,
    };
  }

  // Fetch all existing rows from saved_search_prospects
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

  // Build upsert rows
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
        resurfaced++;
        totalDismissed--;
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

  // Batch upsert (split to preserve first_seen_at on existing rows)
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

  // Update personas table
  const personaUpdate: Record<string, unknown> = {
    apollo_pages_fetched: newApolloPagesFetched,
  };
  if (updateRefreshTimestamp) {
    personaUpdate.last_refreshed_at = now;
    personaUpdate.total_apollo_results = totalEntries;
  }
  await supabase.from("personas").update(personaUpdate).eq("id", searchId);

  return {
    newProspects,
    existingActive,
    existingEnriched,
    totalDismissed: totalDismissed < 0 ? 0 : totalDismissed,
    resurfaced,
    totalFromApollo: deduped.length,
    apolloPagesFetched: newApolloPagesFetched,
  };
}

/**
 * Refreshes a saved search — re-fetches the top PAGES_PER_REFRESH pages
 * (regardless of how deep extend has pulled) to check for newly-ranked
 * results. Extend depth is preserved via apollo_pages_fetched, which is
 * computed as max(previousPagesFetched, lastPageReached) at the upsert
 * step, so future extends still start from the correct page.
 * Updates last_refreshed_at.
 */
export async function refreshSavedSearchProspects(params: {
  searchId: string;
  tenantId: string;
  filters: PersonaFilters;
  supabase: SupabaseClient;
}): Promise<RefreshResult> {
  const { searchId, supabase } = params;

  // Read existing apollo_pages_fetched so refresh re-scans any pages previously extended.
  const { data: personaRow } = await supabase
    .from("personas")
    .select("apollo_pages_fetched")
    .eq("id", searchId)
    .single();

  const previousPagesFetched = (personaRow?.apollo_pages_fetched as number | null) ?? 0;
  const endPage = PAGES_PER_REFRESH;

  return fetchAndUpsertApolloRange({
    ...params,
    startPage: 1,
    endPage,
    updateRefreshTimestamp: true,
    previousPagesFetched,
  });
}

/**
 * Extends a saved search — fetches the next PAGES_PER_REFRESH pages beyond
 * what's already been pulled. Does NOT touch last_refreshed_at.
 * Caps at Apollo's hard page limit (500).
 */
export async function extendSavedSearchProspects(params: {
  searchId: string;
  tenantId: string;
  filters: PersonaFilters;
  supabase: SupabaseClient;
  currentPagesFetched: number;
}): Promise<RefreshResult> {
  const startPage = params.currentPagesFetched + 1;
  const endPage = params.currentPagesFetched + PAGES_PER_REFRESH;

  if (startPage > MAX_APOLLO_PAGE) {
    // Already at Apollo's ceiling — return current state unchanged.
    const { data: existingRows } = await params.supabase
      .from("saved_search_prospects")
      .select("status")
      .eq("saved_search_id", params.searchId);
    const rows = existingRows ?? [];
    return {
      newProspects: 0,
      existingActive: rows.filter((r) => r.status === "active").length,
      existingEnriched: rows.filter((r) => r.status === "enriched").length,
      totalDismissed: rows.filter((r) => r.status === "dismissed").length,
      resurfaced: 0,
      totalFromApollo: 0,
      apolloPagesFetched: params.currentPagesFetched,
    };
  }

  return fetchAndUpsertApolloRange({
    searchId: params.searchId,
    tenantId: params.tenantId,
    filters: params.filters,
    supabase: params.supabase,
    startPage,
    endPage,
    updateRefreshTimestamp: false,
    previousPagesFetched: params.currentPagesFetched,
  });
}
