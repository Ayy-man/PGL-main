import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchExaForResearch } from "@/lib/research/exa-search";
import { digestForScrapbook } from "@/lib/research/research-digest";
import { researchRateLimiter } from "@/lib/research/research-rate-limit";
import { chatCompletion } from "@/lib/ai/openrouter";
import { logProspectActivity } from "@/lib/activity";
import { recordResearchTelemetry } from "@/lib/search/telemetry";

const bodySchema = z.object({
  query: z.string().min(1).max(500),
  session_id: z.string().uuid().optional().nullable(),
});

/**
 * POST /api/prospects/[prospectId]/research
 *
 * Main streaming research endpoint. Multi-phase stream:
 *   data-session -> data-message-id -> data-reasoning -> data-tool ->
 *   data-shimmer -> data-card (N times) -> data-sources
 *
 * Uses Vercel AI SDK v6 createUIMessageStream.
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

  // --- Parse body ---
  let body: z.infer<typeof bodySchema>;
  try {
    const raw = await request.json();
    body = bodySchema.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { query, session_id } = body;

  // --- Rate limit ---
  const { success: rateLimitOk } = await researchRateLimiter.limit(
    `research:${tenantId}`
  );
  if (!rateLimitOk) {
    return NextResponse.json(
      { error: "Daily research limit reached. Resets at midnight UTC." },
      { status: 429 }
    );
  }

  // --- Fetch prospect context ---
  const admin = createAdminClient();
  const { data: prospect, error: prospectError } = await admin
    .from("prospects")
    .select("first_name, last_name, full_name, company, title")
    .eq("id", prospectId)
    .single();

  if (prospectError || !prospect) {
    return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
  }

  // --- Create or get session ---
  let sessionId: string;
  if (session_id) {
    sessionId = session_id;
  } else {
    const { data: newSession, error: sessionError } = await admin
      .from("research_sessions")
      .insert({
        prospect_id: prospectId,
        tenant_id: tenantId,
        user_id: user.id,
      })
      .select("id")
      .single();

    if (sessionError || !newSession) {
      console.error("[research] Session creation failed:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }
    sessionId = newSession.id;
  }

  // --- Insert user message ---
  const { data: userMessage, error: msgError } = await admin
    .from("research_messages")
    .insert({
      session_id: sessionId,
      tenant_id: tenantId,
      role: "user",
      content: query,
      metadata: {},
      result_cards: [],
    })
    .select("id")
    .single();

  if (msgError) {
    console.error("[research] User message insert failed:", msgError);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }

  const userMessageId = userMessage.id;

  // --- Fire-and-forget activity log ---
  logProspectActivity({
    prospectId,
    tenantId,
    userId: user.id,
    category: "data",
    eventType: "research_scrapbook_search",
    title: "Research scrapbook search",
    metadata: { query, source: "research_scrapbook" },
  });

  // --- Build stream ---
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const streamStartMs = Date.now();

      // Phase 0: Stream session and message IDs first so client can capture them
      writer.write({
        type: "data-session",
        data: { session_id: sessionId },
      } as Parameters<typeof writer.write>[0]);

      writer.write({
        type: "data-message-id",
        data: { message_id: userMessageId },
      } as Parameters<typeof writer.write>[0]);

      // Phase 1: Reasoning — query reformulation
      writer.write({
        type: "data-reasoning",
        data: { status: "reformulating", query },
      } as Parameters<typeof writer.write>[0]);

      let reformulatedQuery = query;
      try {
        const reformResponse = await chatCompletion(
          "You are a search query reformulator. Given a user question about a specific person, create an optimal web search query. Return ONLY the search query string, nothing else.",
          `Person: ${prospect.full_name ?? `${prospect.first_name} ${prospect.last_name}`}, ${prospect.title ?? ""} at ${prospect.company ?? ""}.\nUser question: ${query}`,
          100
        );
        reformulatedQuery = reformResponse.text.trim() || query;
      } catch (err) {
        console.error("[research] Query reformulation failed:", err);
        // Fall back to original query
      }

      writer.write({
        type: "data-reasoning",
        data: { status: "complete", reformulated: reformulatedQuery },
      } as Parameters<typeof writer.write>[0]);

      // Phase 2: Tool call — Exa search
      writer.write({
        type: "data-tool",
        id: "exa-search",
        data: { status: "running", query: reformulatedQuery },
      } as Parameters<typeof writer.write>[0]);

      const exaResults = await searchExaForResearch(reformulatedQuery);

      writer.write({
        type: "data-tool",
        id: "exa-search",
        data: { status: "completed", count: exaResults.length },
      } as Parameters<typeof writer.write>[0]);

      // Phase 3: Shimmer while digesting
      writer.write({
        type: "data-shimmer",
        data: { active: true },
        transient: true,
      } as Parameters<typeof writer.write>[0]);

      const cards = await digestForScrapbook(
        prospect.full_name ?? `${prospect.first_name} ${prospect.last_name}`,
        prospect.company ?? "",
        query,
        exaResults
      );

      writer.write({
        type: "data-shimmer",
        data: { active: false },
        transient: true,
      } as Parameters<typeof writer.write>[0]);

      // Phase 4: Stream cards one by one
      for (const card of cards) {
        writer.write({
          type: "data-card",
          data: card,
        } as Parameters<typeof writer.write>[0]);
      }

      // Phase 5: Sources
      writer.write({
        type: "data-sources",
        data: { urls: exaResults.map((r) => r.url).filter(Boolean) },
      } as Parameters<typeof writer.write>[0]);

      // Save assistant message with result_cards to DB
      const { data: assistantMessage, error: assistantMsgError } = await admin
        .from("research_messages")
        .insert({
          session_id: sessionId,
          tenant_id: tenantId,
          role: "assistant",
          content:
            cards.length > 0
              ? `Found ${cards.length} results for: ${query}`
              : `No relevant results found for: ${query}`,
          result_cards: cards,
          metadata: {
            reformulated_query: reformulatedQuery,
            exa_result_count: exaResults.length,
            card_count: cards.length,
          },
        })
        .select("id")
        .single();

      if (assistantMsgError) {
        console.error("[research] Assistant message insert failed:", assistantMsgError);
      }

      // Stream the assistant message ID so client can correlate pins
      if (assistantMessage) {
        writer.write({
          type: "data-message-id",
          data: { message_id: assistantMessage.id },
        } as Parameters<typeof writer.write>[0]);
      }

      // Fire-and-forget telemetry for scrapbook search
      recordResearchTelemetry({
        ts: new Date().toISOString(),
        tenantId,
        prospectId,
        query,
        totalLatencyMs: Date.now() - streamStartMs,
        entityType: "person",
        channelsUsed: ["exa"],
        channels: [{
          channelId: "exa",
          resultCount: exaResults.length,
          latencyMs: Date.now() - streamStartMs,
          cached: false,
        }],
      }).catch(() => {});

      // Update session updated_at
      await admin
        .from("research_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", sessionId);
    },
  });

  return createUIMessageStreamResponse({ stream });
}
