import type { SignalCategory } from "@/types/database";

// --- DB row types ---

export interface ResearchSession {
  id: string;
  prospect_id: string;
  tenant_id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResearchMessage {
  id: string;
  session_id: string;
  tenant_id: string;
  role: "user" | "assistant" | "system";
  content: string | null;
  metadata: Record<string, unknown>;
  result_cards: ScrapbookCard[];
  created_at: string;
}

export interface ResearchPin {
  id: string;
  message_id: string | null;
  prospect_id: string;
  tenant_id: string;
  user_id: string | null;
  card_index: number;
  pin_target: PinTarget;
  edited_headline: string | null;
  edited_summary: string | null;
  created_at: string;
}

// --- Scrapbook card types ---

export type ScrapbookCardCategory = SignalCategory | "other";

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
  // Exa-sourced optional fields (not present on old persisted cards)
  exa_highlights?: string[];
  exa_highlight_scores?: number[];
  exa_summary?: string;
  exa_author?: string;
  exa_image?: string;
}

// --- Pin types ---

export type PinTarget = "signal" | "dossier_hook" | "note";

export interface PinRequest {
  card_index: number;
  pin_target: PinTarget;
  message_id: string;
  edited_headline?: string;
  edited_summary?: string;
  card: ScrapbookCard;
}

// --- Streaming data part types ---

export type ResearchStreamPhase = "reasoning" | "tool_call" | "shimmer" | "card" | "sources" | "complete";

export interface ReasoningData {
  status: "reformulating" | "complete";
  query?: string;
  duration_ms?: number;
}

export interface ToolCallData {
  status: "running" | "completed" | "failed";
  query?: string;
  count?: number;
  error?: string;
}

export interface ShimmerData {
  active: boolean;
}

export interface SourcesData {
  urls: string[];
}

// --- Session list item (for history dropdown) ---

export interface SessionListItem {
  id: string;
  first_query: string | null;
  result_count: number;
  created_at: string;
}
