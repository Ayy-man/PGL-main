import { withCircuitBreaker } from '../circuit-breaker';
import { trackApiUsage } from '@/lib/enrichment/track-api-usage';

/**
 * ContactOut API enrichment result
 */
export type ContactOutResult = {
  found: boolean;
  personalEmail?: string;
  phone?: string;
  error?: string;
  circuitOpen?: boolean;
};

/**
 * ContactOut API response structure (from /v1/people/enrich with include params)
 */
type ContactOutApiResponse = {
  profile?: {
    personal_emails?: string[];
    work_emails?: string[];
    phones?: string[];
    // Profile fields also returned
    name?: string;
    title?: string;
    company?: string;
    linkedin_url?: string;
  };
  // Some endpoints return this shape instead
  success?: boolean;
  person?: {
    personal_emails?: string[];
    phone_numbers?: string[];
    phones?: string[];
  };
};

/**
 * Internal function to enrich contact data from ContactOut API
 *
 * @param params - Either email or linkedinUrl required
 * @returns ContactOut enrichment result
 */
async function enrichContactOutInternal(params: {
  email?: string;
  linkedinUrl?: string;
}): Promise<ContactOutResult> {
  const apiKey = process.env.CONTACTOUT_API_KEY;

  if (!apiKey) {
    return {
      found: false,
      error: 'ContactOut API key not configured',
    };
  }

  if (!params.email && !params.linkedinUrl) {
    return {
      found: false,
      error: 'Either email or linkedinUrl required',
    };
  }

  try {
    // Validate LinkedIn URL format if provided — ContactOut only accepts /in/ or /pub/ URLs
    if (params.linkedinUrl) {
      const url = params.linkedinUrl;
      if (!url.includes('linkedin.com/in/') && !url.includes('linkedin.com/pub/')) {
        return {
          found: false,
          error: 'LinkedIn URL must contain /in/ or /pub/ path (Sales Navigator/Recruiter URLs not supported)',
        };
      }
    }

    // CRITICAL: must pass `include` to get contact data — API returns profile-only by default
    const response = await fetch('https://api.contactout.com/v1/people/enrich', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'token': apiKey,
      },
      body: JSON.stringify({
        email: params.email,
        linkedin_url: params.linkedinUrl,
        include: ['personal_email', 'phone'],
      }),
    });

    // Handle 404 as "not found" (person not in ContactOut database)
    if (response.status === 404) {
      return {
        found: false,
      };
    }

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      return {
        found: false,
        error: `Rate limit exceeded${retryAfter ? ` - retry after ${retryAfter}s` : ''}`,
      };
    }

    // Handle auth errors
    if (response.status === 400) {
      return {
        found: false,
        error: 'ContactOut API: bad credentials or invalid request',
      };
    }

    if (!response.ok) {
      return {
        found: false,
        error: `ContactOut API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json() as ContactOutApiResponse;

    // Handle both possible response shapes
    const personalEmail =
      data.profile?.personal_emails?.[0] ??
      data.person?.personal_emails?.[0];
    const phone =
      data.profile?.phones?.[0] ??
      data.person?.phones?.[0] ??
      data.person?.phone_numbers?.[0];

    trackApiUsage("contactout").catch(() => {});

    return {
      found: !!(personalEmail || phone),
      personalEmail,
      phone,
    };
  } catch (error) {
    return {
      found: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Enriches contact information using ContactOut API
 * Wrapped with circuit breaker for resilience
 *
 * @param params - Either email or linkedinUrl required
 * @returns ContactOut enrichment result with personal email and phone
 */
export const enrichContactOut = withCircuitBreaker(
  enrichContactOutInternal,
  { name: 'contactout' }
);
