import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bulkEnrichPeople } from "@/lib/circuit-breaker/apollo-breaker";
import { logError } from "@/lib/error-logger";
import { z } from "zod";
import type { ApolloPerson } from "@/lib/apollo/types";

/**
 * Toggle: when true, returns fake enrichment data instead of calling Apollo.
 * Flip to false once Apollo credits renew (Mar 30).
 */
const USE_MOCK_ENRICHMENT = true;

const previewSchema = z.object({
  id: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  name: z.string().optional(),
  title: z.string().optional(),
  organization_name: z.string().optional(),
});

const requestSchema = z.object({
  apolloIds: z.array(z.string()).min(1).max(25),
  previews: z.array(previewSchema).optional(),
});

const FAKE_LAST_NAMES = [
  "Anderson", "Chen", "Patel", "Müller", "Nakamura", "Santos",
  "O'Brien", "Kovacs", "Larsson", "Kim", "Singh", "Rossi",
  "Dubois", "Petrov", "Tanaka", "Fischer", "Ali", "Johansson",
  "Williams", "Garcia", "Martinez", "Robinson", "Clark", "Lewis", "Lee",
];

const FAKE_DOMAINS = [
  "gmail.com", "outlook.com", "protonmail.com", "icloud.com", "yahoo.com",
];

function generateMockPerson(
  apolloId: string,
  preview?: z.infer<typeof previewSchema>
): ApolloPerson {
  const firstName = preview?.first_name || "Alex";
  const lastName = FAKE_LAST_NAMES[Math.floor(Math.random() * FAKE_LAST_NAMES.length)];
  const fullName = `${firstName} ${lastName}`;
  const orgName = preview?.organization_name || "Acme Corp";
  const title = preview?.title || "Executive";
  const domain = FAKE_DOMAINS[Math.floor(Math.random() * FAKE_DOMAINS.length)];
  const emailLocal = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z.]/g, "");
  const areaCode = 200 + Math.floor(Math.random() * 800);
  const phoneNum = `+1${areaCode}${String(Math.floor(Math.random() * 10000000)).padStart(7, "0")}`;
  const linkedinSlug = `${firstName.toLowerCase()}${lastName.toLowerCase()}`.replace(/[^a-z]/g, "");

  return {
    id: apolloId,
    first_name: firstName,
    last_name: lastName,
    name: fullName,
    title,
    headline: `${title} at ${orgName}`,
    organization_name: orgName,
    city: ["San Francisco", "New York", "Austin", "Miami", "Chicago", "Seattle", "Boston"][Math.floor(Math.random() * 7)],
    state: ["CA", "NY", "TX", "FL", "IL", "WA", "MA"][Math.floor(Math.random() * 7)],
    country: "United States",
    email: `${emailLocal}@${domain}`,
    email_status: "verified",
    phone_numbers: [{ raw_number: phoneNum, sanitized_number: phoneNum, type: "mobile" }],
    linkedin_url: `https://www.linkedin.com/in/${linkedinSlug}`,
    photo_url: undefined,
    employment_history: [
      { organization_name: orgName, title, current: true },
    ],
    organization: {
      name: orgName,
      industry: "Technology",
      estimated_num_employees: 500 + Math.floor(Math.random() * 50000),
      founded_year: 1990 + Math.floor(Math.random() * 30),
    },
    _enriched: true,
  };
}

/**
 * POST /api/apollo/bulk-enrich
 *
 * Enriches Apollo preview results into full contact data (costs credits).
 * Called explicitly by "Enrich Selection" — never on search.
 *
 * When USE_MOCK_ENRICHMENT is true, generates fake data for testing.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = requestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { apolloIds, previews } = parseResult.data;

    // Mock mode: generate fake enrichment data for testing
    if (USE_MOCK_ENRICHMENT) {
      const previewMap = new Map(
        (previews || []).map((p) => [p.id, p])
      );
      const mockPeople = apolloIds.map((id) =>
        generateMockPerson(id, previewMap.get(id))
      );
      console.info(`[apollo/bulk-enrich] MOCK: generated ${mockPeople.length} fake enriched people`);
      return NextResponse.json({
        people: mockPeople,
        count: mockPeople.length,
        mock: true,
      });
    }

    // Real mode: call Apollo API
    const enriched = await bulkEnrichPeople(apolloIds);

    return NextResponse.json({
      people: enriched,
      count: enriched.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[apollo/bulk-enrich] Error:", message);

    if (message.includes("insufficient credits")) {
      return NextResponse.json(
        { error: "Apollo credits exhausted. Credits renew at your next billing cycle." },
        { status: 402 }
      );
    }

    logError({
      route: "/api/apollo/bulk-enrich",
      method: "POST",
      statusCode: 500,
      errorMessage: message,
    });
    return NextResponse.json({ error: "Enrichment failed" }, { status: 500 });
  }
}
