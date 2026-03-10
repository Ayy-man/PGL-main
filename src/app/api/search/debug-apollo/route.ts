import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { translateFiltersToApolloParams } from "@/lib/apollo/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/search/debug-apollo
 *
 * Runs multiple Apollo test queries to isolate which filter causes 0 results.
 * Remove after debugging.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "APOLLO_API_KEY not set" }, { status: 500 });
  }

  // The persona filters from DB
  const personaFilters = {
    titles: ["Founder"],
    industries: ["Biotechnology"],
    seniorities: ["founder", "c_suite"],
  };

  // What our code translates them to
  const translatedParams = translateFiltersToApolloParams(personaFilters);

  // Test cases — progressively add filters to find which one breaks
  const tests = [
    { name: "1_titles_only", payload: { person_titles: ["Founder"], per_page: 3, page: 1 } },
    { name: "2_titles+seniority", payload: { person_titles: ["Founder"], person_seniorities: ["founder", "c_suite"], per_page: 3, page: 1 } },
    { name: "3_titles+industry", payload: { person_titles: ["Founder"], organization_industries: ["Biotechnology"], per_page: 3, page: 1 } },
    { name: "4_full_translated", payload: { ...translatedParams, per_page: 3, page: 1 } },
    { name: "5_industry_only", payload: { organization_industries: ["Biotechnology"], per_page: 3, page: 1 } },
    { name: "6_seniority_only", payload: { person_seniorities: ["c_suite"], per_page: 3, page: 1 } },
  ];

  const results: Record<string, unknown> = {
    persona_filters: personaFilters,
    translated_apollo_params: translatedParams,
  };

  for (const test of tests) {
    try {
      const res = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify(test.payload),
      });

      const data = await res.json();
      results[test.name] = {
        status: res.status,
        payload_sent: test.payload,
        total_entries: data.total_entries ?? data.pagination?.total_entries ?? 0,
        people_returned: data.people?.length ?? 0,
        first_person: data.people?.[0] ? {
          name: `${data.people[0].first_name} ${data.people[0].last_name ?? data.people[0].last_name_obfuscated ?? ""}`.trim(),
          title: data.people[0].title,
          org: data.people[0].organization?.name,
        } : null,
        error: data.error || data.message || null,
      };
    } catch (err) {
      results[test.name] = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json(results);
}
