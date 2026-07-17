/**
 * API Key Pool Service
 *
 * Manages multiple OpenAI API keys to bypass rate limits, rotating between them.
 *
 * CAVEAT: state (rate-limit flags, round-robin index) lives in a module-level singleton
 * in memory. On serverless/edge hosts (e.g. Vercel) each invocation may run in a fresh
 * instance, so this state is effectively per-request and rotation degrades to "pick the
 * first available key". For true cross-request rotation, run on a long-lived server or
 * back this with a shared store (Redis/Upstash).
 */

interface APIKeyInfo {
  key: string;
  requestCount: number;
  lastUsed: number;
  rateLimited: boolean;
  rateLimitResetTime: number;
}

class APIKeyPool {
  private keys: APIKeyInfo[] = [];
  private currentIndex = 0;

  constructor(apiKeys: string[]) {
    this.keys = apiKeys.map(key => ({
      key,
      requestCount: 0,
      lastUsed: 0,
      rateLimited: false,
      rateLimitResetTime: 0
    }));
  }

  /**
   * Get next available API key
   */
  getNextKey(): string {
    const now = Date.now();

    // Reset rate-limited keys if their timeout expired
    this.keys.forEach(keyInfo => {
      if (keyInfo.rateLimited && now > keyInfo.rateLimitResetTime) {
        keyInfo.rateLimited = false;
        keyInfo.requestCount = 0;
        console.log(`[KEY-POOL] Key ${this.maskKey(keyInfo.key)} reset`);
      }
    });

    // Find first non-rate-limited key
    for (let i = 0; i < this.keys.length; i++) {
      const index = (this.currentIndex + i) % this.keys.length;
      const keyInfo = this.keys[index];

      if (!keyInfo.rateLimited) {
        this.currentIndex = (index + 1) % this.keys.length;
        keyInfo.requestCount++;
        keyInfo.lastUsed = now;
        
        console.log(`[KEY-POOL] Using key ${index + 1}/${this.keys.length} (${keyInfo.requestCount} requests)`);
        return keyInfo.key;
      }
    }

    // All keys rate-limited! Use oldest one and hope
    console.warn('[KEY-POOL] All keys rate-limited! Using oldest...');
    const oldestKey = this.keys.reduce((oldest, current) => 
      current.lastUsed < oldest.lastUsed ? current : oldest
    );
    return oldestKey.key;
  }

  /**
   * Mark a key as rate-limited
   */
  markRateLimited(key: string, resetAfterSeconds: number = 60) {
    const keyInfo = this.keys.find(k => k.key === key);
    if (keyInfo) {
      keyInfo.rateLimited = true;
      keyInfo.rateLimitResetTime = Date.now() + (resetAfterSeconds * 1000);
      console.warn(`[KEY-POOL] Key ${this.maskKey(key)} rate-limited for ${resetAfterSeconds}s`);
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    const available = this.keys.filter(k => !k.rateLimited).length;
    const total = this.keys.length;
    const totalRequests = this.keys.reduce((sum, k) => sum + k.requestCount, 0);

    return {
      available,
      total,
      totalRequests,
      keys: this.keys.map(k => ({
        masked: this.maskKey(k.key),
        requests: k.requestCount,
        rateLimited: k.rateLimited
      }))
    };
  }

  private maskKey(key: string): string {
    return key.substring(0, 10) + '...' + key.substring(key.length - 4);
  }
}

// Singleton instance
let keyPool: APIKeyPool | null = null;

/**
 * Initialize the key pool with multiple API keys
 */
export function initializeKeyPool(apiKeys: string[]) {
  if (apiKeys.length === 0) {
    throw new Error('At least one API key required');
  }
  
  // Don't re-initialize if already done with same number of keys
  if (keyPool && keyPool.getStats().total === apiKeys.length) {
    return keyPool;
  }
  
  keyPool = new APIKeyPool(apiKeys);
  console.log(`[KEY-POOL] Initialized with ${apiKeys.length} keys`);
  return keyPool;
}

/**
 * Get the current key pool instance
 */
export function getKeyPool(): APIKeyPool {
  if (!keyPool) {
    // Fallback to single key from env
    const singleKey = process.env.OPENAI_API_KEY;
    if (!singleKey) {
      throw new Error('No API keys configured');
    }
    keyPool = new APIKeyPool([singleKey]);
  }
  return keyPool;
}

export default {
  initializeKeyPool,
  getKeyPool
};
