import { inngest } from "../client";
import { enrichContactOut } from "@/lib/enrichment/contactout";
import { enrichExa } from "@/lib/enrichment/exa";
import { enrichEdgar } from "@/lib/enrichment/edgar";
import { generateProspectSummary } from "@/lib/enrichment/claude";
import { logActivity } from "@/lib/activity-logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Helper to update enrichment source status for a specific source
 */
async function updateSourceStatus(
  prospectId: string,
  source: string,
  status: string
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
    [source]: status,
  };

  await supabase
    .from("prospects")
    .update({ enrichment_source_status: updatedStatus })
    .eq("id", prospectId);
}

/**
 * Inngest function: Multi-step prospect enrichment workflow
 *
 * Orchestrates data collection from 4 sources:
 * 1. ContactOut - personal contact info
 * 2. Exa.ai - web presence and wealth signals
 * 3. SEC EDGAR - insider transactions (if public company)
 * 4. Claude AI - 2-3 sentence prospect summary
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
      isPublicCompany,
      companyCik,
    } = event.data;

    const supabase = createAdminClient();

    // Step 1: Mark enrichment as in progress
    await step.run("mark-in-progress", async () => {
      const { error } = await supabase
        .from("prospects")
        .update({
          enrichment_status: "in_progress",
          enrichment_source_status: {
            contactout: "pending",
            exa: "pending",
            sec: "pending",
            claude: "pending",
          },
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

        // Update source status
        await updateSourceStatus(prospectId, "contactout", sourceStatus);

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
        await updateSourceStatus(prospectId, "contactout", "failed");

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

        // Update source status
        await updateSourceStatus(prospectId, "exa", sourceStatus);

        // Save web data if found
        if (result.found && (result.mentions.length > 0 || result.wealthSignals.length > 0)) {
          await supabase
            .from("prospects")
            .update({
              web_data: {
                mentions: result.mentions,
                wealth_signals: result.wealthSignals,
                source: "exa",
                enriched_at: new Date().toISOString(),
              },
            })
            .eq("id", prospectId);
        }

        return {
          found: result.found,
          mentions: result.mentions,
          wealthSignals: result.wealthSignals,
          status: sourceStatus,
        };
      } catch (error) {
        console.error("[Inngest] Exa enrichment failed:", error);

        // Mark as failed but don't stop workflow
        await updateSourceStatus(prospectId, "exa", "failed");

        return { found: false, mentions: [], wealthSignals: [], status: "failed" };
      }
    });

    // Step 4: Fetch SEC EDGAR data (only for public companies)
    const edgarData = await step.run("fetch-edgar", async () => {
      // Skip if not public company
      if (!isPublicCompany || !companyCik) {
        await updateSourceStatus(prospectId, "sec", "skipped");
        return { found: false, transactions: [], status: "skipped" };
      }

      try {
        const result = await enrichEdgar({ cik: companyCik, name });

        // Determine source status
        let sourceStatus = "complete";
        if (result.circuitOpen) {
          sourceStatus = "circuit_open";
        } else if (result.error || !result.found) {
          sourceStatus = "failed";
        }

        // Update source status
        await updateSourceStatus(prospectId, "sec", sourceStatus);

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
        await updateSourceStatus(prospectId, "sec", "failed");

        return { found: false, transactions: [], status: "failed" };
      }
    });

    // Step 5: Generate AI summary with Claude
    const aiSummary = await step.run("generate-summary", async () => {
      try {
        const summary = await generateProspectSummary({
          name,
          title,
          company,
          contactData: contactData.found && ("personalEmail" in contactData || "phone" in contactData)
            ? { personalEmail: contactData.personalEmail, phone: contactData.phone }
            : null,
          webData: exaData.found && ("mentions" in exaData && "wealthSignals" in exaData)
            ? { mentions: exaData.mentions, wealthSignals: exaData.wealthSignals }
            : null,
          insiderData: edgarData.found && "transactions" in edgarData
            ? { transactions: edgarData.transactions }
            : null,
        });

        // Update source status
        await updateSourceStatus(prospectId, "claude", "complete");

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
        await updateSourceStatus(prospectId, "claude", "failed");

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
        claude: aiSummary.status,
      },
    };
  }
);
