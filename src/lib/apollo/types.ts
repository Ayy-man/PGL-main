/**
 * Apollo.io API search parameters.
 * Maps to Apollo's /api/v1/mixed_people/search endpoint.
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
 * Phone number structure from Apollo API.
 */
export interface ApolloPhoneNumber {
  raw_number: string;
  sanitized_number?: string;
  type?: string;
}

/**
 * Employment history entry from Apollo API.
 */
export interface ApolloEmploymentHistory {
  organization_name: string;
  title: string;
  current: boolean;
}

/**
 * Person record from Apollo API.
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
}

/**
 * Pagination metadata from Apollo API.
 */
export interface ApolloPagination {
  page: number;
  per_page: number;
  total_entries: number;
  total_pages: number;
}

/**
 * Apollo API search response structure.
 */
export interface ApolloSearchResponse {
  people: ApolloPerson[];
  pagination: ApolloPagination;
}
