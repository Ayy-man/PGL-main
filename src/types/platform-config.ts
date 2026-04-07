export type PlatformConfigKey =
  | "apollo_mock_enrichment";

export interface PlatformConfigRow {
  key: PlatformConfigKey;
  value: unknown;
  description: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface PlatformConfigMap {
  apollo_mock_enrichment: boolean;
}
