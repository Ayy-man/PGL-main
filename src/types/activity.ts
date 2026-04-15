export type ActivityCategory = 'outreach' | 'data' | 'team' | 'custom';

export type OutreachEventType = 'call' | 'email' | 'met' | 'linkedin';
export type DataEventType = 'enrichment_started' | 'enrichment_complete' | 'enrichment_failed'
  | 'contactout_updated' | 'exa_updated' | 'sec_updated' | 'ai_summary_updated'
  | 'market_data_updated' | 'new_signal'
  | 'research_scrapbook_search' | 'research_scrapbook_pin';
export type TeamEventType = 'profile_viewed' | 'note_added' | 'added_to_list' | 'removed_from_list'
  | 'exported_csv' | 'profile_edited' | 'status_changed' | 'tag_added' | 'tag_removed'
  | 'assigned_to' | 'photo_uploaded';
export type CustomEventType = 'custom';

export type EventType = OutreachEventType | DataEventType | TeamEventType | CustomEventType;

export interface ProspectActivity {
  id: string;
  prospect_id: string;
  tenant_id: string;
  user_id: string | null;
  category: ActivityCategory;
  event_type: EventType;
  title: string;
  note: string | null;
  metadata: Record<string, unknown>;
  event_at: string;
  created_at: string;
  triggers_status_change: boolean;
}

export interface CreateActivityParams {
  prospectId: string;
  tenantId: string;
  userId?: string | null;
  category: ActivityCategory;
  eventType: EventType;
  title: string;
  note?: string | null;
  metadata?: Record<string, unknown>;
  eventAt?: string; // ISO string, defaults to now()
  triggersStatusChange?: boolean;
}

// Category display colors (dot + left accent)
export const CATEGORY_COLORS: Record<ActivityCategory, { dot: string; accent: string; label: string }> = {
  outreach: { dot: 'var(--gold-primary)', accent: 'rgba(var(--gold-primary-rgb), 0.3)', label: 'Outreach' },
  data: { dot: 'var(--info, #3b82f6)', accent: 'rgba(59,130,246,0.3)', label: 'Data Updates' },
  team: { dot: 'rgba(255,255,255,0.25)', accent: 'transparent', label: 'Team Activity' },
  custom: { dot: 'var(--purple, #a855f7)', accent: 'rgba(168,85,247,0.3)', label: 'Custom' },
};

// Event type to default title mapping
export const EVENT_TITLES: Partial<Record<EventType, string>> = {
  call: 'Logged a call',
  email: 'Sent an email',
  met: 'Met in person',
  linkedin: 'LinkedIn touchpoint',
  enrichment_started: 'Enrichment started',
  enrichment_complete: 'Enrichment completed',
  enrichment_failed: 'Enrichment failed',
  contactout_updated: 'ContactOut data updated',
  exa_updated: 'Web intelligence updated',
  sec_updated: 'SEC filings updated',
  ai_summary_updated: 'AI summary generated',
  market_data_updated: 'Market data refreshed',
  new_signal: 'New signal detected',
  research_scrapbook_search: 'Research scrapbook search',
  research_scrapbook_pin: 'Research finding pinned',
  profile_viewed: 'Viewed profile',
  note_added: 'Note added',
  added_to_list: 'Added to list',
  removed_from_list: 'Removed from list',
  exported_csv: 'Exported to CSV',
  profile_edited: 'Profile edited',
  status_changed: 'Status changed',
  tag_added: 'Tag added',
  tag_removed: 'Tag removed',
  assigned_to: 'Assigned to team member',
  photo_uploaded: 'Photo uploaded',
  custom: 'Custom event',
};
