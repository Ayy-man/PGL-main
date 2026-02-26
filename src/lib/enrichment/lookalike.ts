/** Apollo filter shape used by lookalike persona generation. */
export interface ApolloFilters {
  person_titles?: string[];
  person_seniorities?: string[];
  organization_industry_tag_ids?: string[];
  person_locations?: string[];
  organization_num_employees_ranges?: string[];
  q_keywords?: string;
}

/** Lookalike search stub. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function generateLookalikePersona(params: Record<string, unknown>) {
  return {
    persona: {
      name: "Lookalike Persona",
      jobTitles: [] as string[],
      seniority: [] as string[],
      industries: [] as string[],
      companySize: [] as string[],
      locations: [] as string[],
      keywords: "",
      reasoning: "Not yet configured.",
    },
    apolloFilters: {} as ApolloFilters,
  };
}
