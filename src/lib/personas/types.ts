export interface PersonaFilters {
  organization_names?: string[];
  titles?: string[];
  seniorities?: string[];
  industries?: string[];
  locations?: string[];
  companySize?: string[];
  keywords?: string;
  person_name?: string;
  net_worth_range?: string;
}

export interface Persona {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  filters: PersonaFilters;
  is_starter: boolean;
  created_by: string;
  last_used_at: string | null;
  last_refreshed_at: string | null;       // NEW
  total_apollo_results: number | null;     // NEW
  created_at: string;
  updated_at: string;
}

export interface CreatePersonaInput {
  name: string;
  description?: string;
  filters: PersonaFilters;
}

export interface UpdatePersonaInput {
  name?: string;
  description?: string;
  filters?: PersonaFilters;
}

export type SavedSearchProspectStatus = 'active' | 'dismissed' | 'enriched';

export interface SavedSearchProspect {
  id: string;
  saved_search_id: string;
  tenant_id: string;
  apollo_person_id: string;
  apollo_data: Record<string, unknown>;
  status: SavedSearchProspectStatus;
  prospect_id: string | null;
  first_seen_at: string;
  last_seen_at: string;
  dismissed_at: string | null;
  dismissed_by: string | null;
  is_new: boolean;
  created_at: string;
}
