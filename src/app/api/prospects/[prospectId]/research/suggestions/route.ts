import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/prospects/[prospectId]/research/suggestions
 *
 * Returns contextual research suggestion pills for the empty-session state.
 * Template-based — no LLM call. Instant, free, and always relevant.
 *
 * Body (optional):
 *   { count?: number, exclude?: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> }
) {
  const { prospectId } = await params;

  // --- Auth ---
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = user.app_metadata?.tenant_id as string;
  if (!tenantId) {
    return NextResponse.json({ error: "No tenant" }, { status: 403 });
  }

  // Parse optional body params
  let count = 4;
  let exclude: string[] = [];
  try {
    const body = await request.json();
    if (body?.count && typeof body.count === "number") count = Math.min(body.count, 6);
    if (Array.isArray(body?.exclude)) exclude = body.exclude;
  } catch {
    // No body or invalid JSON — use defaults
  }

  const admin = createAdminClient();

  // --- Fetch prospect context ---
  const { data: prospect, error: prospectError } = await admin
    .from("prospects")
    .select("first_name, full_name, title, company, publicly_traded_symbol")
    .eq("id", prospectId)
    .single();

  if (prospectError || !prospect) {
    return NextResponse.json(
      { error: "Prospect not found" },
      { status: 404 }
    );
  }

  const name = prospect.full_name ?? prospect.first_name ?? "this person";
  const company = prospect.company;
  const title = prospect.title;
  const ticker = prospect.publicly_traded_symbol;

  // Template pool — use prospect data to build practical search queries
  // These are generic enough to return results for anyone, specific enough to be useful
  const pool: string[] = [];

  // Always include: name-based searches
  pool.push(`${name} latest news`);
  pool.push(`${name} career background`);
  pool.push(`${name} LinkedIn profile`);

  // Company-based if available
  if (company) {
    pool.push(`${company} news`);
    pool.push(`${company} leadership team`);
    pool.push(`${company} funding and investors`);
    pool.push(`${name} ${company} role`);
  }

  // Title-based
  if (title && company) {
    pool.push(`${title} at ${company}`);
  }

  // Ticker-based for public companies
  if (ticker) {
    pool.push(`${ticker} SEC filings`);
    pool.push(`${ticker} executive transactions`);
  }

  // Generic wealth intel that works for anyone
  pool.push(`${name} net worth`);
  pool.push(`${name} investments`);
  pool.push(`${name} philanthropy`);
  pool.push(`${name} real estate`);
  pool.push(`${name} board memberships`);
  pool.push(`${name} interview`);

  // Filter out excluded suggestions and deduplicate
  const filtered = pool.filter(
    (s) => !exclude.some((ex) => s.toLowerCase() === ex.toLowerCase())
  );

  // Shuffle deterministically based on prospect ID to vary order per person
  const hash = prospectId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const shuffled = filtered
    .map((s, i) => ({ s, sort: (hash * (i + 1) * 7) % 1000 }))
    .sort((a, b) => a.sort - b.sort)
    .map((x) => x.s);

  return NextResponse.json({
    suggestions: shuffled.slice(0, count),
  });
}
