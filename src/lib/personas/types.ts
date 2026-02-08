export interface PersonaFilters {
  titles?: string[];
  seniorities?: string[];
  industries?: string[];
  locations?: string[];
  companySize?: string[];
  keywords?: string;
}

export interface Persona {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  filters: PersonaFilters;
  is_starter: boolean;
  last_used_at: string | null;
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
