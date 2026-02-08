import { z } from "zod";

/**
 * Validation schema for persona search API requests.
 */
export const searchRequestSchema = z.object({
  personaId: z.string().uuid(),
  page: z.number().int().min(1).max(500).default(1),
  pageSize: z.number().int().min(10).max(100).default(50),
});

/**
 * Persona filter criteria matching Apollo.io search capabilities.
 */
export const PersonaFilters = z.object({
  titles: z.array(z.string()).optional(),
  seniorities: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  companySize: z.array(z.string()).optional(),
  keywords: z.string().optional(),
});

export type PersonaFiltersType = z.infer<typeof PersonaFilters>;
export type SearchRequestType = z.infer<typeof searchRequestSchema>;
