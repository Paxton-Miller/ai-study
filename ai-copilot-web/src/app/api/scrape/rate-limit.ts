type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

const buckets = new Map<string, RateLimitBucket>();

function getBucketKey(subject: string, toolName: string) {
  return `${subject}:${toolName}`;
}

export function checkRateLimit({
  subject,
  toolName,
  limit,
  windowMs,
}: {
  subject: string;
  toolName: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const now = Date.now();
  const key = getBucketKey(subject, toolName);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterMs: 0,
    };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, bucket.resetAt - now),
    };
  }

  bucket.count += 1;

  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterMs: 0,
  };
}
