import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logProspectActivity } from "@/lib/activity";
import type { PinRequest as _PinRequest } from "@/types/research";

const scrapbookCardSchema = z.object({
  index: z.number(),
  headline: z.string(),
  summary: z.string(),
  category: z.string(),
  source_url: z.string().default(""),
  source_name: z.string().default(""),
  source_favicon: z.string().default(""),
  event_date: z.string().nullable().default(null),
  event_date_precision: z.enum(["exact", "approximate", "unknown"]).default("unknown"),
  relevance: z.enum(["high", "medium", "low"]).default("medium"),
  answer_relevance: z.enum(["direct", "tangential", "background"]).default("background"),
  is_about_target: z.boolean().default(false),
  raw_snippet: z.string().default(""),
  confidence_note: z.string().default(""),
});

const bodySchema = z.object({
  card_index: z.number().int().min(0),
  pin_target: z.enum(["signal", "note", "dossier_hook"]),
  message_id: z.string().uuid(),
  edited_headline: z.string().optional(),
  edited_summary: z.string().optional(),
  card: scrapbookCardSchema,
});

/**
 * POST /api/prospects/[prospectId]/research/pin
 *
 * Pin a research card to one of three targets:
 * - "signal": insert into prospect_signals
 * - "dossier_hook": append to intelligence_dossier.outreach_hooks
 * - "note": save pin record only
 *
 * Always inserts into research_pins and logs activity.
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

  const { card_index, pin_target, message_id, edited_headline, edited_summary, card } = body;
  const displayHeadline = edited_headline ?? card.headline;
  const displaySummary = edited_summary ?? card.summary;

  const admin = createAdminClient();

  // --- Handle pin target ---
  if (pin_target === "signal") {
    const { error: signalError } = await admin.from("prospect_signals").insert({
      prospect_id: prospectId,
      tenant_id: tenantId,
      category: card.category === "other" ? "company_intel" : card.category,
      headline: displayHeadline,
      summary: displaySummary,
      source_url: card.source_url || null,
      event_date: card.event_date ?? null,
      raw_source: "research",
      is_new: true,
      created_at: new Date().toISOString(),
    });

    if (signalError) {
      console.error("[research/pin] Signal insert failed:", signalError);
      return NextResponse.json(
        { error: "Failed to save signal" },
        { status: 500 }
      );
    }
  } else if (pin_target === "dossier_hook") {
    // Fetch-then-update pattern for JSONB append
    const { data: prospectData, error: fetchError } = await admin
      .from("prospects")
      .select("intelligence_dossier")
      .eq("id", prospectId)
      .single();

    if (fetchError) {
      console.error("[research/pin] Prospect fetch failed:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch prospect" },
        { status: 500 }
      );
    }

    const dossier =
      (prospectData?.intelligence_dossier as Record<string, unknown>) ?? {};
    const existingHooks = Array.isArray(dossier.outreach_hooks)
      ? (dossier.outreach_hooks as string[])
      : [];
    const hookText = displaySummary || displayHeadline;
    const updatedHooks = [...existingHooks, hookText];

    const { error: updateError } = await admin
      .from("prospects")
      .update({
        intelligence_dossier: { ...dossier, outreach_hooks: updatedHooks },
      })
      .eq("id", prospectId);

    if (updateError) {
      console.error("[research/pin] Dossier update failed:", updateError);
      return NextResponse.json(
        { error: "Failed to update dossier" },
        { status: 500 }
      );
    }
  }
  // "note" target: just save to research_pins (handled below)

  // --- Always save to research_pins ---
  const { error: pinError } = await admin.from("research_pins").insert({
    message_id: message_id,
    prospect_id: prospectId,
    tenant_id: tenantId,
    user_id: user.id,
    card_index: card_index,
    pin_target: pin_target,
    edited_headline: edited_headline ?? null,
    edited_summary: edited_summary ?? null,
  });

  if (pinError) {
    console.error("[research/pin] Pin record insert failed:", pinError);
    return NextResponse.json(
      { error: "Failed to save pin record" },
      { status: 500 }
    );
  }

  // --- Log activity ---
  await logProspectActivity({
    prospectId,
    tenantId,
    userId: user.id,
    category: "data",
    eventType: "research_scrapbook_pin",
    title: "Research finding pinned",
    metadata: {
      pin_target: pin_target,
      headline: displayHeadline,
    },
  });

  return NextResponse.json({ success: true });
}
