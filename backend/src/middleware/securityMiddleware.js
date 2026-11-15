// Lightweight security helpers (no extra dependencies required).

// 1. Basic security headers
export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Cache-Control", "no-store");
  next();
};

// 2. Remove MongoDB operator keys ($ne, $gt ...) and dotted keys from the body
const clean = (value) => {
  if (Array.isArray(value)) {
    value.forEach(clean);
  } else if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete value[key];
      } else {
        clean(value[key]);
      }
    }
  }
};

export const sanitizeBody = (req, res, next) => {
  if (req.body) clean(req.body);
  next();
};

// 3. Simple in-memory rate limiter (per IP)
export const createRateLimiter = ({ windowMs, max, message }) => {
  const hits = new Map();

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  timer.unref();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ success: false, message });
    }

    next();
  };
};
