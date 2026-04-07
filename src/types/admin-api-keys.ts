export type IntegrationId =
  | "apollo"
  | "contactout"
  | "exa"
  | "sec_edgar"
  | "finnhub"
  | "openrouter"
  | "inngest"
  | "supabase"
  | "upstash_redis";

export type BreakerState = "closed" | "open" | "half_open" | "none";
export type ConfigStatus = "configured" | "missing" | "partial";

export interface EnvVarStatus {
  name: string;
  configured: boolean;
  preview: string | null; // masked, never raw
}

export interface IntegrationStatus {
  id: IntegrationId;
  label: string;
  category: "enrichment" | "infra" | "ai";
  description: string;
  docsUrl: string;
  status: ConfigStatus;
  envVars: EnvVarStatus[];
  breakerState: BreakerState;
  hasMockMode: boolean;
  mockModeActive: boolean;
  supportsTest: boolean;
}

/**
 * Central registry of all integrations the admin page surfaces.
 * Order controls card order in the UI.
 */
export const INTEGRATION_REGISTRY: Array<{
  id: IntegrationId;
  label: string;
  category: IntegrationStatus["category"];
  description: string;
  docsUrl: string;
  envVarNames: string[];
  hasMockMode: boolean;
  supportsTest: boolean;
}> = [
  {
    id: "apollo",
    label: "Apollo.io",
    category: "enrichment",
    description: "Prospect search + bulk enrichment",
    docsUrl: "https://apolloapi.dev",
    envVarNames: ["APOLLO_API_KEY"],
    hasMockMode: true,
    supportsTest: true,
  },
  {
    id: "contactout",
    label: "ContactOut",
    category: "enrichment",
    description: "Personal email + phone lookup",
    docsUrl: "https://contactout.com/api",
    envVarNames: ["CONTACTOUT_API_KEY"],
    hasMockMode: false,
    supportsTest: true,
  },
  {
    id: "exa",
    label: "Exa.ai",
    category: "enrichment",
    description: "Web search + wealth signals",
    docsUrl: "https://docs.exa.ai",
    envVarNames: ["EXA_API_KEY"],
    hasMockMode: false,
    supportsTest: true,
  },
  {
    id: "sec_edgar",
    label: "SEC EDGAR",
    category: "enrichment",
    description: "Insider trading filings (Form 4)",
    docsUrl: "https://www.sec.gov/developer",
    envVarNames: ["SEC_EDGAR_USER_AGENT"],
    hasMockMode: false,
    supportsTest: true,
  },
  {
    id: "finnhub",
    label: "Finnhub",
    category: "enrichment",
    description: "Real-time stock quotes",
    docsUrl: "https://finnhub.io/docs/api",
    envVarNames: ["FINNHUB_API_KEY"],
    hasMockMode: false,
    supportsTest: true,
  },
  {
    id: "openrouter",
    label: "OpenRouter (Claude AI)",
    category: "ai",
    description: "Prospect summaries + dossier generation",
    docsUrl: "https://openrouter.ai/docs",
    envVarNames: ["OPENROUTER_API_KEY"],
    hasMockMode: false,
    supportsTest: true,
  },
  {
    id: "inngest",
    label: "Inngest",
    category: "infra",
    description: "Background job orchestration",
    docsUrl: "https://www.inngest.com/docs",
    envVarNames: ["INNGEST_SIGNING_KEY", "INNGEST_EVENT_KEY"],
    hasMockMode: false,
    supportsTest: false,
  },
  {
    id: "supabase",
    label: "Supabase",
    category: "infra",
    description: "Database, Auth, Storage",
    docsUrl: "https://supabase.com/docs",
    envVarNames: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ],
    hasMockMode: false,
    supportsTest: true,
  },
  {
    id: "upstash_redis",
    label: "Upstash Redis",
    category: "infra",
    description: "Caching layer (Apollo search results)",
    docsUrl: "https://upstash.com/docs/redis",
    envVarNames: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    hasMockMode: false,
    supportsTest: true,
  },
];
