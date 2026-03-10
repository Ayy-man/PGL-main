import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/search/debug-apollo
 *
 * Tests different Apollo industry parameter names to find the correct one.
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

  // Test every possible industry parameter name
  const tests = [
    { name: "organization_industries", payload: { organization_industries: ["Biotechnology"], per_page: 2, page: 1 } },
    { name: "organization_industry_tag_ids", payload: { organization_industry_tag_ids: ["Biotechnology"], per_page: 2, page: 1 } },
    { name: "q_organization_keyword_tags", payload: { q_organization_keyword_tags: ["Biotechnology"], per_page: 2, page: 1 } },
    { name: "q_organization_keyword_tags_string", payload: { q_organization_keyword_tags: "Biotechnology", per_page: 2, page: 1 } },
    { name: "industry_tag_ids", payload: { industry_tag_ids: ["Biotechnology"], per_page: 2, page: 1 } },
    { name: "organization_industry_keywords", payload: { organization_industry_keywords: ["Biotechnology"], per_page: 2, page: 1 } },
    { name: "q_keywords_biotech", payload: { q_keywords: "Biotechnology", per_page: 2, page: 1 } },
    { name: "q_organization_industry_tag_ids", payload: { q_organization_industry_tag_ids: ["5567cd4773696439b10b0000"], per_page: 2, page: 1 } },
    { name: "organization_industry_tag_ids_hex", payload: { organization_industry_tag_ids: ["5567cd4773696439b10b0000"], per_page: 2, page: 1 } },
  ];

  const results: Record<string, unknown> = {};

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
        total: data.total_entries ?? data.pagination?.total_entries ?? 0,
        people: data.people?.length ?? 0,
        first: data.people?.[0]?.organization?.name ?? null,
      };
    } catch (err) {
      results[test.name] = { error: err instanceof Error ? err.message : String(err) };
    }
  }

  return NextResponse.json(results);
}
