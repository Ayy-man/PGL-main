import { inngest } from "../client";
import { enrichContactOut } from "@/lib/enrichment/contactout";
import { enrichExa } from "@/lib/enrichment/exa";
import { digestExaResults, type DigestedSignal } from "@/lib/enrichment/exa-digest";
import { enrichEdgar, lookupCompanyCik } from "@/lib/enrichment/edgar";
import { generateProspectSummary } from "@/lib/enrichment/claude";
import { logActivity } from "@/lib/activity-logger";
import { createAdminClient } from "@/lib/supabase/admin";

type SourceStatusPayload = { status: string; error?: string; at: string };

/**
 * Helper to update enrichment source status for a specific source
 */
async function updateSourceStatus(
  prospectId: string,
  source: string,
  payload: SourceStatusPayload
): Promise<void> {
  const supabase = createAdminClient();

  // Fetch current status
  const { data: currentProspect } = await supabase
    .from("prospects")
    .select("enrichment_source_status")
    .eq("id", prospectId)
    .single();

  // Update the specific source status
  const updatedStatus = {
    ...(currentProspect?.enrichment_source_status || {}),
    [source]: payload,
  };

  await supabase
    .from("prospects")
    .update({ enrichment_source_status: updatedStatus })
    .eq("id", prospectId);
}

/**
 * Inngest function: Multi-step prospect enrichment workflow
 *
 * Orchestrates data collection from 5 sources:
 * 1. mark-in-progress - initialize enrichment status
 * 2. ContactOut - personal contact info
 * 3. Exa.ai - web presence and wealth signals
 * 4. SEC EDGAR - insider transactions (if public company)
 * 4.5. Market Data (Finnhub + Yahoo Finance) - stock snapshot (if public company with ticker)
 * 5. Claude AI - 2-3 sentence prospect summary
 * 6. Finalize - mark complete, log activity
 *
 * Each step runs independently with its own error handling.
 * Partial enrichment is saved even if later steps fail.
 *
 * Covers: PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, PROF-07, PROF-08, INFRA-02
 */
export const enrichProspect = inngest.createFunction(
  {
    id: "enrich-prospect",
    retries: 3,
    concurrency: [{ limit: 5 }], // Max 5 concurrent enrichments to manage API rate limits
    onFailure: async ({ error, event }) => {
      console.error("[Inngest] Enrichment workflow failed:", error);

      // Mark prospect enrichment as failed
      const supabase = createAdminClient();
      const eventData = event.data as unknown as { prospectId: string };

      if (eventData?.prospectId) {
        await supabase
          .from("prospects")
          .update({
            enrichment_status: "failed",
          })
          .eq("id", eventData.prospectId);
      }
    },
  },
  { event: "prospect/enrich.requested" },
  async ({ event, step }) => {
    const {
      prospectId,
      tenantId,
      userId,
      email,
      linkedinUrl,
      name,
      company,
      title,
      isPublicCompany: _isPublicCompany,
      companyCik,
      ticker,
    } = event.data;

    const supabase = createAdminClient();

    // Step 1: Mark enrichment as in progress
    await step.run("mark-in-progress", async () => {
      const initialSourceStatus: Record<string, { status: string; at: string }> = {
        contactout: { status: "pending", at: new Date().toISOString() },
        exa: { status: "pending", at: new Date().toISOString() },
        sec: { status: "pending", at: new Date().toISOString() },
        market: { status: "pending", at: new Date().toISOString() },
        claude: { status: "pending", at: new Date().toISOString() },
      };

      const { error } = await supabase
        .from("prospects")
        .update({
          enrichment_status: "in_progress",
          enrichment_started_at: new Date().toISOString(),
          enrichment_source_status: initialSourceStatus,
        })
        .eq("id", prospectId);

      if (error) {
        console.error("[Inngest] Failed to mark enrichment in progress:", error);
        throw error;
      }

      return { status: "in_progress" };
    });

    // Step 2: Fetch ContactOut data
    const contactData = await step.run("fetch-contactout", async () => {
      try {
        const result = await enrichContactOut({ email, linkedinUrl });

        // Determine source status
        let sourceStatus = "complete";
        if (result.circuitOpen) {
          sourceStatus = "circuit_open";
        } else if (result.error || !result.found) {
          sourceStatus = "failed";
        }

        // Update source status with structured payload
        if (sourceStatus === "failed" && result.error) {
          await updateSourceStatus(prospectId, "contactout", {
            status: "failed",
            error: result.error,
            at: new Date().toISOString(),
          });
        } else if (sourceStatus === "circuit_open") {
          await updateSourceStatus(prospectId, "contactout", {
            status: "circuit_open",
            at: new Date().toISOString(),
          });
        } else {
          await updateSourceStatus(prospectId, "contactout", {
            status: sourceStatus,
            at: new Date().toISOString(),
          });
        }

        // Save contact data if found
        if (result.found && (result.personalEmail || result.phone)) {
          await supabase
            .from("prospects")
            .update({
              contact_data: {
                personal_email: result.personalEmail,
                phone: result.phone,
                source: "contactout",
                enriched_at: new Date().toISOString(),
              },
            })
            .eq("id", prospectId);
        }

        return {
          found: result.found,
          personalEmail: result.personalEmail,
          phone: result.phone,
          status: sourceStatus,
        };
      } catch (error) {
        console.error("[Inngest] ContactOut enrichment failed:", error);

        // Mark as failed but don't stop workflow
        await updateSourceStatus(prospectId, "contactout", {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          at: new Date().toISOString(),
        });

        return { found: false, status: "failed" };
      }
    });

    // Step 3: Fetch Exa data
    const exaData = await step.run("fetch-exa", async () => {
      try {
        const result = await enrichExa({ name, company, title });

        // Determine source status
        let sourceStatus = "complete";
        if (result.circuitOpen) {
          sourceStatus = "circuit_open";
        } else if (result.error || !result.found) {
          sourceStatus = "failed";
        }

        // Update source status with structured payload
        if (sourceStatus === "failed" && result.error) {
          await updateSourceStatus(prospectId, "exa", {
            status: "failed",
            error: result.error,
            at: new Date().toISOString(),
          });
        } else if (sourceStatus === "circuit_open") {
          await updateSourceStatus(prospectId, "exa", {
            status: "circuit_open",
            at: new Date().toISOString(),
          });
        } else {
          await updateSourceStatus(prospectId, "exa", {
            status: sourceStatus,
            at: new Date().toISOString(),
          });
        }

        // Digest raw mentions with LLM to get categorized, validated signals
        let digestedSignals: DigestedSignal[] = [];
        if (result.found && result.mentions.length > 0) {
          digestedSignals = await digestExaResults(name, company, result.mentions);
        }

        // Save web data if found (using digested signals)
        if (result.found && digestedSignals.length > 0) {
          await supabase
            .from("prospects")
            .update({
              web_data: {
                signals: digestedSignals,
                source: "exa",
                enriched_at: new Date().toISOString(),
              },
            })
            .eq("id", prospectId);
        }

        return {
          found: result.found,
          signals: digestedSignals,
          status: sourceStatus,
        };
      } catch (error) {
        console.error("[Inngest] Exa enrichment failed:", error);

        // Mark as failed but don't stop workflow
        await updateSourceStatus(prospectId, "exa", {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          at: new Date().toISOString(),
        });

        return { found: false, signals: [] as DigestedSignal[], status: "failed" };
      }
    });

    // Step 3.5: Resolve CIK from company name if not already known
    const resolvedCompany = await step.run("resolve-cik", async () => {
      if (companyCik) {
        return { cik: companyCik, ticker: ticker || null, resolved: false };
      }

      if (!company) {
        return { cik: null, ticker: null, resolved: false };
      }

      try {
        const result = await lookupCompanyCik(company);
        if (result) {
          await supabase
            .from("prospects")
            .update({
              company_cik: result.cik,
              publicly_traded_symbol: result.ticker,
            })
            .eq("id", prospectId);

          return { cik: result.cik, ticker: result.ticker, resolved: true };
        }
        return { cik: null, ticker: null, resolved: false };
      } catch (error) {
        console.error("[Inngest] CIK lookup failed:", error);
        return { cik: null, ticker: null, resolved: false };
      }
    });

    const effectiveCik = resolvedCompany.cik || companyCik;
    const effectiveTicker = resolvedCompany.ticker || ticker;
    const effectiveIsPublic = !!(effectiveCik || effectiveTicker);

    // Step 4: Fetch SEC EDGAR data (only for public companies)
    const edgarData = await step.run("fetch-edgar", async () => {
      // Skip if not public company
      if (!effectiveIsPublic || !effectiveCik) {
        await updateSourceStatus(prospectId, "sec", {
          status: "skipped",
          at: new Date().toISOString(),
        });
        return { found: false, transactions: [], status: "skipped" };
      }

      try {
        const result = await enrichEdgar({ cik: effectiveCik, name });

        // Determine source status
        let sourceStatus = "complete";
        if (result.circuitOpen) {
          sourceStatus = "circuit_open";
        } else if (result.error || !result.found) {
          sourceStatus = "failed";
        }

        // Update source status with structured payload
        if (sourceStatus === "failed" && result.error) {
          await updateSourceStatus(prospectId, "sec", {
            status: "failed",
            error: result.error,
            at: new Date().toISOString(),
          });
        } else if (sourceStatus === "circuit_open") {
          await updateSourceStatus(prospectId, "sec", {
            status: "circuit_open",
            at: new Date().toISOString(),
          });
        } else {
          await updateSourceStatus(prospectId, "sec", {
            status: sourceStatus,
            at: new Date().toISOString(),
          });
        }

        // Save insider data if found
        if (result.found && result.transactions.length > 0) {
          await supabase
            .from("prospects")
            .update({
              insider_data: {
                transactions: result.transactions,
                total_value: result.transactions.reduce((sum, tx) => sum + tx.totalValue, 0),
                source: "sec-edgar",
                enriched_at: new Date().toISOString(),
              },
            })
            .eq("id", prospectId);
        }

        return {
          found: result.found,
          transactions: result.transactions,
          status: sourceStatus,
        };
      } catch (error) {
        console.error("[Inngest] SEC EDGAR enrichment failed:", error);

        // Mark as failed but don't stop workflow
        await updateSourceStatus(prospectId, "sec", {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          at: new Date().toISOString(),
        });

        return { found: false, transactions: [], status: "failed" };
      }
    });

    // Step 4.5: Fetch market data (only for public companies with a ticker)
    const marketData = await step.run("fetch-market-data", async () => {
      if (!effectiveIsPublic || !effectiveTicker) {
        await updateSourceStatus(prospectId, "market", {
          status: "skipped",
          at: new Date().toISOString(),
        });
        return { found: false, status: "skipped" };
      }

      try {
        const { fetchMarketSnapshot } = await import("@/lib/enrichment/market-data");

        // Use insider data from the EDGAR step if available
        const insiderDataForMarket = edgarData.found && edgarData.transactions.length > 0
          ? { transactions: edgarData.transactions }
          : null;

        const snapshot = await fetchMarketSnapshot(effectiveTicker, insiderDataForMarket);

        // Save snapshot to DB
        await supabase
          .from("prospects")
          .update({
            stock_snapshot: snapshot as unknown as Record<string, unknown>,
            stock_snapshot_at: snapshot.fetchedAt,
          })
          .eq("id", prospectId);

        // Mark source complete
        await updateSourceStatus(prospectId, "market", {
          status: "complete",
          at: new Date().toISOString(),
        });

        return { found: true, status: "complete" };
      } catch (error) {
        console.error("[Inngest] Market data enrichment failed:", error);

        await updateSourceStatus(prospectId, "market", {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          at: new Date().toISOString(),
        });

        return { found: false, status: "failed" };
      }
    });

    // Step 5: Generate AI summary with Claude
    const aiSummary = await step.run("generate-summary", async () => {
      try {
        // Map digested signals to the format generateProspectSummary expects
        const webDataForSummary =
          exaData.found && exaData.signals.length > 0
            ? {
                mentions: exaData.signals.map((s) => ({
                  title: s.headline,
                  snippet: s.summary,
                })),
                wealthSignals: exaData.signals
                  .filter((s) => s.category === "wealth_signal" || s.category === "funding")
                  .map((s) => ({ type: s.category, description: s.summary })),
              }
            : null;

        const summary = await generateProspectSummary({
          name,
          title,
          company,
          contactData: contactData.found && ("personalEmail" in contactData || "phone" in contactData)
            ? { personalEmail: contactData.personalEmail, phone: contactData.phone }
            : null,
          webData: webDataForSummary,
          insiderData: edgarData.found && "transactions" in edgarData
            ? { transactions: edgarData.transactions }
            : null,
        });

        // Update source status
        await updateSourceStatus(prospectId, "claude", {
          status: "complete",
          at: new Date().toISOString(),
        });

        // Save AI summary
        await supabase
          .from("prospects")
          .update({
            ai_summary: summary,
          })
          .eq("id", prospectId);

        return { summary, status: "complete" };
      } catch (error) {
        console.error("[Inngest] Claude AI summary generation failed:", error);

        // Mark as failed but don't stop workflow
        await updateSourceStatus(prospectId, "claude", {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          at: new Date().toISOString(),
        });

        return { summary: null, status: "failed" };
      }
    });

    // Step 6: Finalize enrichment
    await step.run("finalize", async () => {
      // Update prospect enrichment status to complete
      await supabase
        .from("prospects")
        .update({
          enrichment_status: "complete",
          last_enriched_at: new Date().toISOString(),
        })
        .eq("id", prospectId);

      // Log activity
      await logActivity({
        tenantId,
        userId,
        actionType: "profile_enriched",
        targetType: "prospect",
        targetId: prospectId,
        metadata: {
          contactout: contactData.status,
          exa: exaData.status,
          sec: edgarData.status,
          market: marketData.status,
          claude: aiSummary.status,
        },
      });

      return { status: "complete", timestamp: new Date().toISOString() };
    });

    return {
      prospectId,
      enrichmentStatus: "complete",
      sources: {
        contactout: contactData.status,
        exa: exaData.status,
        sec: edgarData.status,
        market: marketData.status,
        claude: aiSummary.status,
      },
    };
  }
);
