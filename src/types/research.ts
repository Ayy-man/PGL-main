import type { SignalCategory } from "./database";

export type ScrapbookCardCategory = SignalCategory | "other";

export type PinTarget = "signal" | "dossier_hook" | "note";

export interface ScrapbookCard {
  index: number;
  headline: string;
  summary: string;
  category: ScrapbookCardCategory;
  source_url: string;
  source_name: string;
  source_favicon: string;
  event_date: string | null;
  event_date_precision: "exact" | "approximate" | "unknown";
  relevance: "high" | "medium" | "low";
  answer_relevance: "direct" | "tangential" | "background";
  is_about_target: boolean;
  raw_snippet: string;
  confidence_note: string;
}

export interface ResearchSession {
  id: string;
  prospect_id: string;
  tenant_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  first_query?: string;
  result_count?: number;
}

export interface ResearchMessage {
  id: string;
  session_id: string;
  tenant_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: Record<string, unknown> | null;
  result_cards: ScrapbookCard[] | null;
  created_at: string;
}

export interface ResearchPin {
  id: string;
  message_id: string;
  prospect_id: string;
  tenant_id: string;
  user_id: string;
  card_index: number;
  pin_target: PinTarget;
  edited_headline: string;
  edited_summary: string;
  created_at: string;
}

export interface SessionListItem {
  id: string;
  created_at: string;
  first_query: string;
  result_count: number;
}
