import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chatCompletion } from "@/lib/ai/openrouter";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are a search query parser for a lead generation platform. Convert natural language queries into structured Apollo.io search filters.

Return ONLY valid JSON with this structure (omit fields that aren't mentioned in the query):
{
  "titles": ["array of job titles"],
  "seniorities": ["from ONLY: owner, founder, c_suite, partner, vp, head, director, manager, senior, entry, intern"],
  "industries": ["array of industries"],
  "locations": ["array of locations — city, state, or country"],
  "companySize": ["from ONLY: 1,10 | 11,50 | 51,200 | 201,500 | 501,1000 | 1001,5000 | 5001,10000 | 10001,"],
  "keywords": "remaining search terms as a single string"
}

Rules:
- Map natural language to the closest Apollo enum values
- "C-level", "C-suite", "executive" → seniority "c_suite"
- "VP", "vice president" → seniority "vp"
- "senior leadership" → seniorities ["c_suite", "vp", "director"]
- "startup" → companySize ["1,10", "11,50"]
- "enterprise", "large company" → companySize ["1001,5000", "5001,10000", "10001,"]
- "mid-size", "mid-market" → companySize ["201,500", "501,1000"]
- Only include fields the user actually mentioned or implied
- If the query is very short or vague, put it in "keywords" and leave other fields empty`;

/**
 * POST /api/search/parse-query
 *
 * Takes natural language text and returns structured PersonaFilters
 * using AI to extract intent.
 */
export async function POST(request: NextRequest) {
  const start = Date.now();
  let query = "";

  try {
    const body = await request.json();
    query = body.query;

    console.info("[parse-query] ── Received ──", { query, wordCount: query?.trim().split(/\s+/).length });

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      console.warn("[parse-query] Empty query, returning 400");
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("[parse-query] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.info("[parse-query] User:", user.email);

    // Short queries (1-2 words) — just use as keywords, skip LLM
    const wordCount = query.trim().split(/\s+/).length;
    if (wordCount <= 2) {
      console.info(`[parse-query] Short query (${wordCount} words), skipping LLM → keywords only (${Date.now() - start}ms)`);
      return NextResponse.json({
        filters: { keywords: query.trim() },
        parsed: false,
      });
    }

    // Call AI to parse NL → structured filters
    console.info("[parse-query] Calling OpenRouter for NL parsing...");
    const llmStart = Date.now();

    const response = await chatCompletion(SYSTEM_PROMPT, query.trim(), 500);

    const llmMs = Date.now() - llmStart;
    console.info(`[parse-query] AI response received (${llmMs}ms)`, {
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    });

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.text.trim();
    console.info("[parse-query] Raw LLM output:", jsonStr);

    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const filters = JSON.parse(jsonStr);
    const totalMs = Date.now() - start;

    console.info(`[parse-query] ── Parse complete (${totalMs}ms, LLM: ${llmMs}ms) ──`, {
      query,
      filters,
      fieldCount: Object.keys(filters).length,
    });

    return NextResponse.json({ filters, parsed: true });
  } catch (error) {
    const totalMs = Date.now() - start;
    console.error(`[parse-query] ── Failed (${totalMs}ms) ──`, {
      query,
      error: error instanceof Error ? error.message : error,
    });

    // Fallback: return raw query as keywords
    return NextResponse.json({
      filters: { keywords: query?.trim() ?? "" },
      parsed: false,
    });
  }
}
