/**
 * CSV Export Utilities
 *
 * Column definitions and formatting helpers for exporting enriched prospect data to CSV.
 * Handles JSONB field extraction, null safety, and Excel compatibility formatting.
 */

import type { Prospect, ListMember } from '@/types/database';

export const CSV_COLUMNS = [
  { key: 'name', header: 'Name' },
  { key: 'title', header: 'Title' },
  { key: 'company', header: 'Company' },
  { key: 'location', header: 'Location' },
  { key: 'enrichmentStatus', header: 'Enrichment Status' },
  { key: 'lastEnrichedAt', header: 'Last Enriched' },
  { key: 'workEmail', header: 'Work Email' },
  { key: 'personalEmail', header: 'Personal Email' },
  { key: 'workPhone', header: 'Work Phone' },
  { key: 'phone', header: 'Personal Phone' },
  { key: 'linkedinUrl', header: 'LinkedIn URL' },
  { key: 'dossierSummary', header: 'Intelligence Dossier' },
  { key: 'wealthAssessment', header: 'Wealth Assessment' },
  { key: 'companyContext', header: 'Company Context' },
  { key: 'outreachHooks', header: 'Outreach Hooks' },
  { key: 'wealthSignals', header: 'Wealth Signals' },
  { key: 'insiderTrades', header: 'Insider Trades (Count)' },
  { key: 'aiSummary', header: 'AI Summary' },
  { key: 'listStatus', header: 'List Status' },
  { key: 'notes', header: 'Notes' },
] as const;

/**
 * Format a prospect and list membership record into a flat CSV row
 *
 * @param prospect - Raw prospect record from database
 * @param listMember - Raw list_members record from database
 * @returns Flat object with CSV column keys
 */
export function formatProspectRow(
  prospect: Prospect,
  listMember: ListMember
): Record<string, string> {
  // Extract personal contact data from JSONB
  const contactData = prospect.contact_data || {};
  const personalEmail = contactData.personal_email || '';
  const phone = contactData.phone || '';
  const workPhone = contactData.work_phone || '';

  // Extract and format wealth signals from JSONB
  const webData = prospect.web_data || {};
  const wealthSignalsArray = webData.wealth_signals || [];
  const wealthSignals = Array.isArray(wealthSignalsArray)
    ? wealthSignalsArray.slice(0, 5).join(' | ')
    : '';

  // Count insider trades from JSONB
  const insiderData = prospect.insider_data || {};
  const tradesArray = insiderData.trades || [];
  const insiderTradesCount = Array.isArray(tradesArray)
    ? tradesArray.length.toString()
    : '0';

  // Extract intelligence dossier fields
  const dossier = prospect.intelligence_dossier as Record<string, unknown> | null;
  const dossierSummary = (dossier?.summary as string) || '';
  const wealthAssessment = (dossier?.wealth_assessment as string) || '';
  const companyContext = (dossier?.company_context as string) || '';
  const outreachHooksArr = (dossier?.outreach_hooks as string[]) || [];
  const outreachHooks = Array.isArray(outreachHooksArr)
    ? outreachHooksArr.join(' | ')
    : '';

  // Enrichment status
  const enrichmentStatus = prospect.enrichment_status === 'complete'
    ? 'Complete'
    : prospect.enrichment_status === 'in_progress'
      ? 'In Progress'
      : prospect.enrichment_status === 'pending'
        ? 'Pending'
        : prospect.enrichment_status === 'failed'
          ? 'Failed'
          : 'Not enriched';

  const lastEnrichedAt = prospect.last_enriched_at || prospect.enriched_at || '';

  // AI Summary — replace placeholder text with blank for unenriched prospects
  let aiSummary = prospect.ai_summary || '';
  if (aiSummary.startsWith('Limited enrichment data') || aiSummary.startsWith('Insufficient enrichment data')) {
    aiSummary = enrichmentStatus === 'Complete' ? aiSummary : '';
  }

  // Get list membership data
  const listStatus = listMember?.status || 'active';
  const notes = listMember?.notes || '';

  // Helper to escape newlines and handle null/undefined
  const clean = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Replace newlines with spaces for CSV compatibility
    return str.replace(/\n/g, ' ').replace(/\r/g, '');
  };

  return {
    name: clean(prospect.full_name),
    title: clean(prospect.title),
    company: clean(prospect.company),
    location: clean(prospect.location),
    enrichmentStatus,
    lastEnrichedAt: clean(lastEnrichedAt),
    workEmail: clean(prospect.work_email),
    personalEmail: clean(personalEmail),
    workPhone: clean(workPhone),
    phone: clean(phone),
    linkedinUrl: clean(prospect.linkedin_url),
    dossierSummary: clean(dossierSummary),
    wealthAssessment: clean(wealthAssessment),
    companyContext: clean(companyContext),
    outreachHooks: clean(outreachHooks),
    wealthSignals: clean(wealthSignals),
    insiderTrades: clean(insiderTradesCount),
    aiSummary: clean(aiSummary),
    listStatus: clean(listStatus),
    notes: clean(notes),
  };
}
