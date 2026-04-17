import type { ApolloPerson } from "./types";
import type { PersonaFilters } from "@/lib/personas/types";

/**
 * Known IT-staffing / outsourcing / generic-consulting companies that
 * pollute almost every industry-specific search. These companies are so
 * large that they employ people with every conceivable title, so
 * Apollo's fuzzy `q_organization_keyword_tags` and `q_keywords` match
 * them even when the search intent is a specific industry.
 *
 * Only applied when the persona's filters include `industries` (i.e., the
 * user wants a specific vertical) and the persona does NOT explicitly
 * include the company in `organization_names`.
 */
const NOISE_ORG_PATTERNS: RegExp[] = [
  // IT staffing / outsourcing
  /\bInfosys\b/i,
  /\bWipro\b/i,
  /\bTCS\b/i,
  /\bTata Consultancy/i,
  /\bCognizant\b/i,
  /\bHCL Technologies/i,
  /\bTech Mahindra/i,
  /\bCapgemini\b/i,
  /\bAccenture\b/i,
  /\bLTIMindtree\b/i,
  /\bMphasis\b/i,
  /\bHexaware\b/i,

  // Staffing agencies
  /\bRobert Half\b/i,
  /\bRandstad\b/i,
  /\bHays\b/i,
  /\bAdecco\b/i,
  /\bManpowerGroup\b/i,
  /\bKelly Services/i,
  /\bKforce\b/i,
  /\bInsight Global\b/i,
  /\bTEKsystems\b/i,
  /\bRobert Walters/i,
  /\bMichael Page/i,
  /\bPageGroup\b/i,

  // Big 4 consulting (catch-all for non-finance/non-accounting searches)
  /\bDeloitte\b/i,
  /\bPwC\b/i,
  /\bPricewaterhouseCoopers/i,
  /\bErnst & Young/i,
  /\b\bEY\b/i,
  /\bKPMG\b/i,
];

/**
 * Returns true if `orgName` matches any noise pattern AND is NOT
 * explicitly requested in the persona's `organization_names`.
 */
function isNoiseOrg(
  orgName: string,
  explicitOrgs: string[]
): boolean {
  // If the persona explicitly lists this company, don't filter it out
  const lower = orgName.toLowerCase();
  for (let i = 0; i < explicitOrgs.length; i++) {
    if (lower.includes(explicitOrgs[i].toLowerCase())) return false;
  }
  return NOISE_ORG_PATTERNS.some((re) => re.test(orgName));
}

/**
 * Filter out results from known noise companies. Only active when:
 * 1. The persona has `industries` set (user wants a specific vertical)
 * 2. The result's org is NOT in the persona's `organization_names`
 *
 * When the persona already uses `organization_names` (like BigLaw Partners
 * or Top Tech Earners), this filter is a no-op because Apollo already
 * filters by exact company.
 */
export function filterNoiseResults(
  people: ApolloPerson[],
  filters: PersonaFilters
): ApolloPerson[] {
  // Only filter when persona has industry-specific filters
  if (!filters.industries || filters.industries.length === 0) return people;

  // If persona uses org names, Apollo already constrains results — skip
  if (filters.organization_names && filters.organization_names.length > 0) return people;

  const explicitOrgs = filters.organization_names ?? [];

  return people.filter((person) => {
    const orgName = person.organization_name;
    if (!orgName) return true; // keep results with no org info
    return !isNoiseOrg(orgName, explicitOrgs);
  });
}
