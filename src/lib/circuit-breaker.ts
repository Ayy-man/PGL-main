import CircuitBreaker from 'opossum';

/**
 * Default circuit breaker configuration
 * - Opens after 50% failures in a rolling 60s window
 * - Requires minimum 5 calls before circuit can open
 * - Resets after 30s to allow retry
 */
const DEFAULT_BREAKER_OPTIONS = {
  timeout: 10000,        // 10s timeout per request
  errorThresholdPercentage: 50,  // Open after 50% failures
  resetTimeout: 30000,   // Try again after 30s
  rollingCountTimeout: 60000,    // Track failures over 60s window
  volumeThreshold: 5,    // Minimum calls before circuit can open
};

/**
 * Creates a new circuit breaker wrapping the provided function
 *
 * @param fn - Async function to wrap with circuit breaker
 * @param options - Optional overrides for breaker configuration
 * @returns CircuitBreaker instance with event listeners
 */
export function createCircuitBreaker<T>(
  fn: (...args: any[]) => Promise<T>,
  options?: Partial<typeof DEFAULT_BREAKER_OPTIONS>
): CircuitBreaker<any[], T> {
  const breaker = new CircuitBreaker(fn, {
    ...DEFAULT_BREAKER_OPTIONS,
    ...options,
  });

  // Add event listeners for circuit state changes
  breaker.on('open', () => {
    console.warn('[CircuitBreaker] Circuit opened - requests will fail fast');
  });

  breaker.on('halfOpen', () => {
    console.log('[CircuitBreaker] Circuit half-open - attempting recovery');
  });

  breaker.on('close', () => {
    console.log('[CircuitBreaker] Circuit closed - normal operation resumed');
  });

  return breaker;
}

/**
 * Higher-order function that wraps a function with circuit breaker protection
 *
 * @param fn - Async function to wrap
 * @param options - Optional name and breaker configuration
 * @returns Wrapped function with circuit breaker and fallback
 */
export function withCircuitBreaker<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options?: { name?: string } & Partial<typeof DEFAULT_BREAKER_OPTIONS>
): (...args: TArgs) => Promise<TResult> {
  const { name, ...breakerOptions } = options || {};
  const breaker = createCircuitBreaker(fn, breakerOptions);

  // Add name to logging if provided
  if (name) {
    breaker.on('open', () => {
      console.warn(`[CircuitBreaker:${name}] Circuit opened - requests will fail fast`);
    });

    breaker.on('halfOpen', () => {
      console.log(`[CircuitBreaker:${name}] Circuit half-open - attempting recovery`);
    });

    breaker.on('close', () => {
      console.log(`[CircuitBreaker:${name}] Circuit closed - normal operation resumed`);
    });
  }

  // Return wrapped function with circuit breaker
  return async (...args: TArgs): Promise<TResult> => {
    try {
      return await breaker.fire(...args);
    } catch (error) {
      // When circuit is open, provide a user-friendly fallback
      if (breaker.opened) {
        return {
          error: 'Service temporarily unavailable',
          circuitOpen: true,
        } as TResult;
      }
      throw error;
    }
  };
}
