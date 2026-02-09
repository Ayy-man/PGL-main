import { withCircuitBreaker } from '../circuit-breaker';

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
 * ContactOut API response structure
 */
type ContactOutApiResponse = {
  success: boolean;
  person?: {
    personal_emails?: string[];
    phone_numbers?: string[];
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
    const response = await fetch('https://api.contactout.com/v1/people/enrich', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': apiKey,
      },
      body: JSON.stringify({
        email: params.email,
        linkedin_url: params.linkedinUrl,
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

    if (!response.ok) {
      return {
        found: false,
        error: `ContactOut API error: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json() as ContactOutApiResponse;

    if (!data.success || !data.person) {
      return {
        found: false,
      };
    }

    const personalEmail = data.person.personal_emails?.[0];
    const phone = data.person.phone_numbers?.[0];

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
