// A sliding window for each customer. Only successful purchases count.

const RATE_LIMIT = 3;
export const RATE_WINDOW_MS = 3000;

export type RateLimiter = {
  /** Returns 0 when the customer can buy now, else the ms until the next attempt. */
  retryAfterMs(customerId: string, now: number): number;
  record(customerId: string, now: number): void;
  clear(): void;
};

export function createRateLimiter(): RateLimiter {
  const purchaseTimes = new Map<string, number[]>();

  function recentTimes(customerId: string, now: number): number[] {
    const times = (purchaseTimes.get(customerId) ?? []).filter((at) => now - at < RATE_WINDOW_MS);
    if (times.length === 0) purchaseTimes.delete(customerId);
    else purchaseTimes.set(customerId, times);
    return times;
  }

  return {
    retryAfterMs(customerId, now) {
      const times = recentTimes(customerId, now);
      if (times.length < RATE_LIMIT) return 0;
      // The oldest purchase that keeps the customer at the limit leaves the window first.
      return times[times.length - RATE_LIMIT] + RATE_WINDOW_MS - now;
    },

    record(customerId, now) {
      purchaseTimes.set(customerId, [...recentTimes(customerId, now), now]);
    },

    clear() {
      purchaseTimes.clear();
    },
  };
}
