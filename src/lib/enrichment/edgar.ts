/** SEC EDGAR enrichment stub. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function enrichEdgar(...args: unknown[]) {
  return { status: "not_configured" as const, found: false, error: undefined, circuitOpen: false, transactions: [] as { totalValue: number }[] };
}
