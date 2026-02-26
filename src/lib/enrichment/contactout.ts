/** ContactOut enrichment stub. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function enrichContactOut(...args: unknown[]) {
  return {
    status: "not_configured" as const,
    found: false,
    error: undefined,
    circuitOpen: false,
    personalEmail: undefined as string | undefined,
    phone: undefined as string | undefined,
  };
}
