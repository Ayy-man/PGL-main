import { inngest } from "../client";
import { enrichContactOut } from "@/lib/enrichment/contactout";
import { enrichExa } from "@/lib/enrichment/exa";
import { digestExaResults, type DigestedSignal } from "@/lib/enrichment/exa-digest";
import { enrichEdgar, lookupCompanyCik, enrichEdgarByName } from "@/lib/enrichment/edgar";
import { generateProspectSummary, generateIntelligenceDossier } from "@/lib/enrichment/claude";
import { logActivity } from "@/lib/activity-logger";
import { logProspectActivity } from "@/lib/activity";
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

  // Atomic JSONB merge — single write instead of read-modify-write
  await supabase.rpc("merge_enrichment_source_status", {
    p_prospect_id: prospectId,
    p_source: source,
    p_payload: payload,
  });
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
    // Suppress duplicate triggers for the same prospectId within the retention window.
    // Prevents double-charging ContactOut/Exa/SEC credits when two enrich events for
    // the same prospect arrive concurrently (the existing step-0 dedup only catches
    // AFTER a prior run has already written `enriched` to saved_search_prospects).
    //
    // When `event.data.forceRefreshKey` is set (explicit user re-enrich), we append
    // it to the dedup key so a legitimate retry doesn't get suppressed as a duplicate
    // of the prior run. Callers generating a force event MUST supply a unique
    // forceRefreshKey per intended run (a timestamp or UUID).
    idempotency: "event.data.prospectId + '-' + (event.data.forceRefreshKey ?? '')",
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

        logProspectActivity({
          prospectId: eventData.prospectId,
          tenantId: (event.data as Record<string, unknown>).tenantId as string ?? "",
          userId: null,
          category: 'data', eventType: 'enrichment_failed',
          title: 'Enrichment failed',
          metadata: { error: error?.message },
        }).catch(() => {});
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
      forceRefresh,
    } = event.data;

    const supabase = createAdminClient();

    // Step 0: Duplicate enrichment guard — check if this person is already enriched.
    // When forceRefresh is set (explicit user re-enrich), skip the guard entirely
    // so we actually re-run enrichment against the current code (e.g. after shipping
    // a SEC/Exa/ContactOut fix, backfilling existing leads).
    const shouldSkip = await step.run("check-duplicate-enrichment", async () => {
      if (forceRefresh) {
        console.info(`[Inngest] forceRefresh=true for prospect ${prospectId} — bypassing duplicate guard`);
        return false;
      }
      // Look up the Apollo ID for this prospect
      const { data: prospectRow } = await supabase
        .from('prospects')
        .select('apollo_id')
        .eq('id', prospectId)
        .single();

      if (!prospectRow?.apollo_id) return false; // No Apollo ID, proceed normally

      // Check if any saved search already has this person as enriched with a linked prospect
      const { data: existing } = await supabase
        .from('saved_search_prospects')
        .select('prospect_id')
        .eq('apollo_person_id', prospectRow.apollo_id)
        .eq('tenant_id', tenantId)
        .eq('status', 'enriched')
        .not('prospect_id', 'is', null)
        .limit(1);

      if (existing && existing.length > 0) {
        // Already enriched — sync any saved search rows added AFTER the original enrichment ran
        // (e.g. person added to a new search after they were already enriched in another)
        const existingProspectId = existing[0].prospect_id;
        if (existingProspectId && prospectRow?.apollo_id) {
          await supabase
            .from('saved_search_prospects')
            .update({ status: 'enriched', prospect_id: existingProspectId, is_new: false })
            .eq('apollo_person_id', prospectRow.apollo_id)
            .eq('tenant_id', tenantId)
            .neq('status', 'enriched'); // Only update rows not yet linked
        }
        return true; // Signal to skip remaining steps
      }

      return false;
    });

    if (shouldSkip) {
      console.info(`[Inngest] Skipping enrichment for prospect ${prospectId} — already enriched via saved search`);
      return { skipped: true, prospectId };
    }

    // Step 1: Mark enrichment as in progress
    await step.run("mark-in-progress", async () => {
      const initialSourceStatus: Record<string, { status: string; at: string }> = {
        contactout: { status: "pending", at: new Date().toISOString() },
        exa: { status: "pending", at: new Date().toISOString() },
        sec: { status: "pending", at: new Date().toISOString() },
        market: { status: "pending", at: new Date().toISOString() },
        claude: { status: "pending", at: new Date().toISOString() },
        dossier: { status: "pending", at: new Date().toISOString() },
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

      await logProspectActivity({
        prospectId, tenantId, userId,
        category: 'data', eventType: 'enrichment_started',
        title: 'Enrichment started',
      });

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

        // Save contact data if found — merge with existing contact_data so
        // photo_url (and any other field stored at upsert time) is preserved.
        if (result.found && (result.personalEmail || result.phone)) {
          const { data: existingRow } = await supabase
            .from("prospects")
            .select("contact_data")
            .eq("id", prospectId)
            .single();
          const existingContactData = (existingRow?.contact_data as Record<string, unknown>) ?? {};
          await supabase
            .from("prospects")
            .update({
              contact_data: {
                ...existingContactData,
                personal_email: result.personalEmail,
                phone: result.phone,
                source: "contactout",
                enriched_at: new Date().toISOString(),
              },
            })
            .eq("id", prospectId);

          logProspectActivity({
            prospectId, tenantId, userId: null,
            category: 'data', eventType: 'contactout_updated',
            title: 'ContactOut data updated',
            metadata: { found: result.found, hasEmail: !!result.personalEmail, hasPhone: !!result.phone },
          }).catch(() => {});
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

        // Bail early for hard failures before running the expensive digest
        if (result.circuitOpen) {
          await updateSourceStatus(prospectId, "exa", {
            status: "circuit_open",
            at: new Date().toISOString(),
          });
          return { found: false, signals: [] as DigestedSignal[], status: "circuit_open" };
        }
        if (result.error || !result.found) {
          await updateSourceStatus(prospectId, "exa", {
            status: "failed",
            ...(result.error ? { error: result.error } : {}),
            at: new Date().toISOString(),
          });
          return { found: false, signals: [] as DigestedSignal[], status: "failed" };
        }

        // Digest raw mentions with LLM to get categorized, validated signals
        let digestedSignals: DigestedSignal[] = [];
        if (result.found && result.mentions.length > 0) {
          digestedSignals = await digestExaResults(name, company, result.mentions);
        }

        // Status reflects whether we actually extracted usable signals:
        // "complete"  = ≥1 digested signal saved
        // "no_data"   = Exa found articles but LLM filtered them all as irrelevant
        const sourceStatus = digestedSignals.length > 0 ? "complete" : "no_data";
        await updateSourceStatus(prospectId, "exa", {
          status: sourceStatus,
          at: new Date().toISOString(),
        });

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

          // Write digested signals to prospect_signals table (dual-write — web_data kept for backward compat)
          const signalRows = digestedSignals.map((s) => ({
            prospect_id: prospectId,
            tenant_id: tenantId,
            category: s.category,
            headline: s.headline,
            summary: s.summary,
            source_url: s.source_url,
            event_date: s.event_date || null,
            raw_source: "exa" as const,
            is_new: true,
          }));
          // Batched insert — single round-trip, ignore duplicates (partial unique index on source_url).
          // Failure here is logged once and swallowed so the rest of the enrichment continues.
          const { error: exaSignalInsertErr } = await supabase
            .from("prospect_signals")
            .insert(signalRows);
          if (exaSignalInsertErr && !exaSignalInsertErr.message.includes("duplicate")) {
            console.error("[enrich] exa signal batch insert error:", exaSignalInsertErr.message);
          }

          logProspectActivity({
            prospectId, tenantId, userId: null,
            category: 'data', eventType: 'exa_updated',
            title: 'Web intelligence updated',
            metadata: { signalCount: digestedSignals.length },
          }).catch(() => {});
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

    // Step 4: Fetch SEC EDGAR data (public companies via CIK, non-public via EFTS name search)
    const edgarData = await step.run("fetch-edgar", async () => {
      // Wipe stale sec_filing signals from prior runs so re-enrichment
      // produces a clean set. Without this, each run appends duplicates
      // because source_url can change between deploys (raw XML → XSLT
      // viewer) and the unique index on (prospect_id, source_url) treats
      // different URLs as distinct rows.
      await supabase
        .from("prospect_signals")
        .delete()
        .eq("prospect_id", prospectId)
        .eq("category", "sec_filing");

      // Skip only when there is no CIK and no name to search with
      if (!effectiveIsPublic && !name) {
        await updateSourceStatus(prospectId, "sec", {
          status: "skipped",
          at: new Date().toISOString(),
        });
        return { found: false, transactions: [], status: "skipped" };
      }

      // If no CIK, go straight to EFTS name search
      if (!effectiveCik) {
        if (!name) {
          await updateSourceStatus(prospectId, "sec", { status: "skipped", at: new Date().toISOString() });
          return { found: false, transactions: [], status: "skipped" };
        }
        try {
          const eftsResult = await enrichEdgarByName({ name });
          const eftsStatus = eftsResult.found && eftsResult.transactions.length > 0
            ? "complete"
            : eftsResult.found
              ? "no_data"
              : "failed";
          await updateSourceStatus(prospectId, "sec", { status: eftsStatus, at: new Date().toISOString() });
          if (eftsResult.found && eftsResult.transactions.length > 0) {
            await supabase.from("prospects").update({
              insider_data: {
                transactions: eftsResult.transactions,
                total_value: eftsResult.transactions.reduce((sum, tx) => sum + tx.totalValue, 0),
                source: "sec-edgar-efts",
                enriched_at: new Date().toISOString(),
              },
            }).eq("id", prospectId);
            // Batched insert — single round-trip. source_url carries the EDGAR
            // filing URL so the unique index on (prospect_id, source_url)
            // actually dedups re-enrichments and the UI can link back to SEC.
            const eftsSignalRows = eftsResult.transactions.map((tx) => ({
              prospect_id: prospectId,
              tenant_id: tenantId,
              category: "sec_filing",
              headline: `${tx.transactionType} ${tx.shares.toLocaleString()} shares ($${tx.totalValue.toLocaleString()})`,
              summary: `SEC Form 4: ${tx.transactionType} of ${tx.shares.toLocaleString()} shares at $${tx.pricePerShare.toFixed(2)}/share, total value $${tx.totalValue.toLocaleString()}. Filed ${tx.filingDate}.`,
              source_url: tx.sourceUrl ?? null,
              event_date: tx.filingDate || null,
              raw_source: "sec-edgar",
              is_new: true,
            }));
            const { error: eftsSignalInsertErr } = await supabase
              .from("prospect_signals")
              .insert(eftsSignalRows);
            if (eftsSignalInsertErr && !eftsSignalInsertErr.message.includes("duplicate")) {
              console.error("[enrich] SEC EFTS signal batch insert error:", eftsSignalInsertErr.message);
            }
            logProspectActivity({ prospectId, tenantId, userId: null, category: "data", eventType: "sec_updated", title: "SEC filings updated (EFTS)", metadata: { transactionCount: eftsResult.transactions.length } }).catch(() => {});
          }
          return { found: eftsResult.found, transactions: eftsResult.transactions, status: eftsStatus };
        } catch (error) {
          console.error("[Inngest] EFTS-only SEC enrichment failed:", error);
          await updateSourceStatus(prospectId, "sec", { status: "failed", error: error instanceof Error ? error.message : String(error), at: new Date().toISOString() });
          return { found: false, transactions: [], status: "failed" };
        }
      }

      try {
        let result = await enrichEdgar({ cik: effectiveCik, name });

        // Determine source status:
        // "complete"  = found actual Form 4 transactions
        // "no_data"   = company found in EDGAR but no Form 4 transactions on record
        // "failed"    = API error or company not found
        // "circuit_open" = circuit breaker tripped
        let sourceStatus = result.found && result.transactions.length > 0
          ? "complete"
          : result.circuitOpen
            ? "circuit_open"
            : result.error || !result.found
              ? "failed"
              : "no_data"; // found: true, transactions: [] — company exists but no filings

        await updateSourceStatus(prospectId, "sec", {
          status: sourceStatus,
          ...(sourceStatus === "failed" && result.error ? { error: result.error } : {}),
          at: new Date().toISOString(),
        });

        // EFTS fallback: if no transactions yet, try person name search
        if (result.transactions.length === 0 && name) {
          try {
            const eftsResult = await enrichEdgarByName({ name });
            if (eftsResult.found && eftsResult.transactions.length > 0) {
              result = { found: true, transactions: eftsResult.transactions };
              sourceStatus = "complete";
              await updateSourceStatus(prospectId, "sec", {
                status: "complete",
                at: new Date().toISOString(),
              });
            }
          } catch (eftsError) {
            console.warn("[Inngest] EFTS name search fallback failed:", eftsError);
          }
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

          // Write SEC transactions to prospect_signals table (dual-write — insider_data kept).
          // source_url carries the EDGAR filing URL so the partial unique index
          // on (prospect_id, source_url) dedups re-enrichments, and the UI can
          // link back to the original SEC filing.
          const secSignalRows = result.transactions.map((tx) => ({
            prospect_id: prospectId,
            tenant_id: tenantId,
            category: "sec_filing" as const,
            headline: `${tx.transactionType} ${tx.shares.toLocaleString()} shares ($${tx.totalValue.toLocaleString()})`,
            summary: `SEC Form 4: ${tx.transactionType} of ${tx.shares.toLocaleString()} shares at $${tx.pricePerShare.toFixed(2)}/share, total value $${tx.totalValue.toLocaleString()}. Filed ${tx.filingDate}.`,
            source_url: tx.sourceUrl ?? null,
            event_date: tx.filingDate || null,
            raw_source: "sec-edgar" as const,
            is_new: true,
          }));
          if (secSignalRows.length > 0) {
            // Batched insert — single round-trip.
            const { error: secSignalInsertErr } = await supabase
              .from("prospect_signals")
              .insert(secSignalRows);
            if (secSignalInsertErr && !secSignalInsertErr.message.includes("duplicate")) {
              console.error("[enrich] SEC signal batch insert error:", secSignalInsertErr.message);
            }
          }

          logProspectActivity({
            prospectId, tenantId, userId: null,
            category: "data", eventType: "sec_updated",
            title: "SEC filings updated",
            metadata: { transactionCount: result.transactions.length },
          }).catch(() => {});
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

        logProspectActivity({
          prospectId, tenantId, userId: null,
          category: 'data', eventType: 'market_data_updated',
          title: 'Market data refreshed',
        }).catch(() => {});

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

        logProspectActivity({
          prospectId, tenantId, userId: null,
          category: 'data', eventType: 'ai_summary_updated',
          title: 'AI summary generated',
        }).catch(() => {});

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

    // Step 5.5: Generate Intelligence Dossier
    const dossierResult = await step.run("generate-dossier", async () => {
      try {
        const dossier = await generateIntelligenceDossier({
          name,
          title,
          company,
          workEmail: email || null,
          contactData: contactData.found && ("personalEmail" in contactData || "phone" in contactData)
            ? {
                personalEmail: "personalEmail" in contactData ? contactData.personalEmail : undefined,
                phone: "phone" in contactData ? contactData.phone : undefined,
              }
            : null,
          webSignals: exaData.found && exaData.signals.length > 0
            ? exaData.signals.map((s) => ({
                category: s.category,
                headline: s.headline,
                summary: s.summary,
              }))
            : null,
          insiderTransactions: edgarData.found && edgarData.transactions.length > 0
            ? edgarData.transactions
            : null,
          stockSnapshot: effectiveTicker ? { ticker: effectiveTicker } : null,
        });

        if (dossier) {
          await supabase.from("prospects").update({
            intelligence_dossier: dossier,
            dossier_generated_at: new Date().toISOString(),
            dossier_model: "openai/gpt-4o-mini",
          }).eq("id", prospectId);

          // Log dossier output + inputs so we can trace where fields like
          // "Geographic Preference" came from (what signals the LLM had access to)
          logProspectActivity({
            prospectId,
            tenantId,
            userId: null,
            category: "data",
            eventType: "ai_summary_updated",
            title: "Intelligence dossier generated",
            metadata: {
              quick_facts: dossier.quick_facts,
              inputs: {
                webSignalsCount: exaData.found ? exaData.signals.length : 0,
                hasInsiderTransactions: edgarData.found && edgarData.transactions.length > 0,
                insiderTransactionCount: edgarData.found ? edgarData.transactions.length : 0,
                hasTicker: !!effectiveTicker,
                ticker: effectiveTicker ?? null,
                hasContactData: contactData.found,
              },
            },
          }).catch(() => {});
        }

        await updateSourceStatus(prospectId, "dossier", {
          status: dossier ? "complete" : "failed",
          at: new Date().toISOString(),
        });

        return { hasDossier: !!dossier, status: dossier ? "complete" : "failed" };
      } catch (error) {
        console.error("[Inngest] Dossier generation failed:", error);
        await updateSourceStatus(prospectId, "dossier", {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          at: new Date().toISOString(),
        });
        return { hasDossier: false, status: "failed" };
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

      // Cross-search enrichment sync: mark all saved searches containing this person as enriched
      const { data: prospectRow } = await supabase
        .from('prospects')
        .select('apollo_id')
        .eq('id', prospectId)
        .single();

      if (prospectRow?.apollo_id) {
        await supabase
          .from('saved_search_prospects')
          .update({ status: 'enriched', prospect_id: prospectId, is_new: false })
          .eq('apollo_person_id', prospectRow.apollo_id)
          .eq('tenant_id', tenantId);
      }

      // Log activity (backward compat)
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
          dossier: dossierResult.status,
        },
      });

      // Log to new prospect_activity table
      await logProspectActivity({
        prospectId, tenantId, userId,
        category: 'data', eventType: 'enrichment_complete',
        title: 'Enrichment completed',
        metadata: { contactout: contactData.status, exa: exaData.status, sec: edgarData.status, market: marketData.status, claude: aiSummary.status, dossier: dossierResult.status },
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
        dossier: dossierResult.status,
      },
    };
  }
);
