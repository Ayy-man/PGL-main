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
  { key: 'workEmail', header: 'Work Email' },
  { key: 'workPhone', header: 'Work Phone' },
  { key: 'personalEmail', header: 'Personal Email' },
  { key: 'phone', header: 'Personal Phone' },
  { key: 'linkedinUrl', header: 'LinkedIn URL' },
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
    ? wealthSignalsArray.join(', ')
    : '';

  // Count insider trades from JSONB
  const insiderData = prospect.insider_data || {};
  const tradesArray = insiderData.trades || [];
  const insiderTradesCount = Array.isArray(tradesArray)
    ? tradesArray.length.toString()
    : '0';

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
    workEmail: clean(prospect.work_email),
    workPhone: clean(workPhone),
    personalEmail: clean(personalEmail),
    phone: clean(phone),
    linkedinUrl: clean(prospect.linkedin_url),
    wealthSignals: clean(wealthSignals),
    insiderTrades: clean(insiderTradesCount),
    aiSummary: clean(prospect.ai_summary),
    listStatus: clean(listStatus),
    notes: clean(notes),
  };
}
