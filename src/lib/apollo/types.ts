/**
 * Apollo.io API search parameters.
 * Maps to Apollo's /api/v1/mixed_people/api_search endpoint.
 */
export interface ApolloSearchParams {
  person_titles?: string[];
  person_seniorities?: string[];
  organization_industries?: string[];
  person_locations?: string[];
  organization_num_employees_ranges?: string[];
  q_keywords?: string;
  page: number;
  per_page: number;
}

/**
 * Person preview from Apollo search endpoint (obfuscated).
 * Search is free but returns limited data.
 */
export interface ApolloSearchPerson {
  id: string;
  first_name: string;
  last_name_obfuscated?: string;
  title: string;
  last_refreshed_at?: string;
  has_email?: boolean;
  has_city?: boolean;
  has_state?: boolean;
  has_country?: boolean;
  has_direct_phone?: string;
  organization?: {
    name: string;
    has_industry?: boolean;
    has_phone?: boolean;
    has_city?: boolean;
    has_state?: boolean;
    has_country?: boolean;
    has_zip_code?: boolean;
    has_revenue?: boolean;
    has_employee_count?: boolean;
  };
}

/**
 * Apollo search response (from /api_search).
 * Note: total_entries may be at the top level or nested under pagination.
 */
export interface ApolloSearchResponse {
  people: ApolloSearchPerson[];
  total_entries?: number;
  pagination?: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

/**
 * Phone number structure from Apollo enrichment.
 */
export interface ApolloPhoneNumber {
  raw_number: string;
  sanitized_number?: string;
  type?: string;
}

/**
 * Employment history entry from Apollo enrichment.
 */
export interface ApolloEmploymentHistory {
  organization_name: string;
  title: string;
  current: boolean;
}

/**
 * Fully enriched person from /people/match or /people/bulk_match.
 */
export interface ApolloPerson {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title: string;
  headline?: string;
  organization_name?: string;
  city?: string;
  state?: string;
  country?: string;
  email?: string;
  email_status?: string;
  phone_numbers?: ApolloPhoneNumber[];
  linkedin_url?: string;
  photo_url?: string;
  employment_history?: ApolloEmploymentHistory[];
  organization?: {
    name: string;
    industry?: string;
    estimated_num_employees?: number;
    founded_year?: number;
  };
}

/**
 * Bulk match response from /people/bulk_match.
 */
export interface ApolloBulkMatchResponse {
  status: string;
  matches: ApolloPerson[];
  total_requested_enrichments?: number;
  unique_enriched_records?: number;
  credits_consumed?: number;
  missing_records?: number;
}
