function createRateLimiter({
  windowMs = 60000,
  max = 30,
  message = "Too many requests. Please retry shortly.",
} = {}) {
  const buckets = new Map();
  let lastPruneAt = Date.now();

  return (req, res, next) => {
    const now = Date.now();

    if (now - lastPruneAt > windowMs) {
      for (const [bucketKey, value] of buckets.entries()) {
        if (value.resetAt <= now) {
          buckets.delete(bucketKey);
        }
      }

      lastPruneAt = now;
    }

    const key = req.user?.id || req.ip || "anonymous";
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);

      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });
    }

    return next();
  };
}

const loginRateLimit = createRateLimiter({
  windowMs: 60000,
  max: 5,
  message: "Login request limit reached. Please retry shortly.",
});

const exportRateLimit = createRateLimiter({
  windowMs: 60000,
  max: 2,
  message: "Export request limit reached. Please retry shortly.",
});

const analyticsRateLimit = createRateLimiter({
  windowMs: 60000,
  max: 45,
  message: "Dashboard analytics request limit reached. Please retry shortly.",
});

const attachmentUploadRateLimit = createRateLimiter({
  windowMs: 60000,
  max: 10,
  message: "Attachment upload limit reached. Please retry shortly.",
});

const notificationPollingRateLimit = createRateLimiter({
  windowMs: 60000,
  max: 30,
  message: "Notification request limit reached. Please retry shortly.",
});

module.exports = {
  createRateLimiter,
  loginRateLimit,
  exportRateLimit,
  analyticsRateLimit,
  attachmentUploadRateLimit,
  notificationPollingRateLimit,
};
