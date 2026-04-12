import { z } from "zod";

/**
 * Persona filter criteria matching Apollo.io search capabilities.
 */
export const PersonaFilters = z.object({
  organization_names: z.array(z.string()).optional(),
  titles: z.array(z.string()).optional(),
  seniorities: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  companySize: z.array(z.string()).optional(),
  keywords: z.string().optional(),
  person_name: z.string().optional(),
  net_worth_range: z.string().optional(),
});

/**
 * Validation schema for persona search API requests.
 */
export const searchRequestSchema = z.object({
  personaId: z.string().uuid().optional(),
  page: z.number().int().min(1).max(500).default(1),
  pageSize: z.number().int().min(1).max(25).default(25),
  filterOverrides: PersonaFilters.optional(),
});

export type PersonaFiltersType = z.infer<typeof PersonaFilters>;
export type SearchRequestType = z.infer<typeof searchRequestSchema>;
