import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/search/debug-apollo
 *
 * Temporary debug endpoint — sends a minimal Apollo search to verify
 * the API key works and returns results. Remove after debugging.
 */
export async function GET() {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "APOLLO_API_KEY not set" }, { status: 500 });
  }

  // Minimal search — just "CEO" title, should return results for any valid key
  const testPayload = {
    person_titles: ["CEO"],
    per_page: 5,
    page: 1,
  };

  try {
    const res = await fetch("https://api.apollo.io/api/v1/mixed_people/api_search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify(testPayload),
    });

    const status = res.status;
    const text = await res.text();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    return NextResponse.json({
      apollo_http_status: status,
      api_key_prefix: apiKey.slice(0, 8) + "...",
      request_payload: testPayload,
      response_summary: parsed ? {
        people_count: parsed.people?.length ?? 0,
        total_entries: parsed.total_entries ?? parsed.pagination?.total_entries ?? "N/A",
        first_person: parsed.people?.[0] ? {
          name: parsed.people[0].first_name,
          title: parsed.people[0].title,
          org: parsed.people[0].organization?.name,
        } : null,
        error: parsed.error || parsed.message || null,
      } : { raw_text: text.slice(0, 500) },
    });
  } catch (err) {
    return NextResponse.json({
      error: "Fetch failed",
      message: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
