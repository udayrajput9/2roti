const rateLimit = require('express-rate-limit');
const db = require('../config/database');

// ─── Scalability: In-Memory IP Block Cache (TTL = 5 minutes) ─────────────────
// Prevents a DB hit on EVERY request for IP block check.
// Without this, 500 concurrent users = 500 simultaneous DB queries just for IP check.
const ipBlockCache = new Map(); // { ip -> { blocked: bool, expiresAt: timestamp } }
const IP_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedIpBlock(ip) {
  const entry = ipBlockCache.get(ip);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    ipBlockCache.delete(ip);
    return null;
  }
  return entry.blocked;
}

const MAX_CACHE_ENTRIES = 5000;

function setCachedIpBlock(ip, blocked) {
  // Data Structure Guard: Bounded LRU Eviction O(1)
  // Ensures cache space is strictly O(K) bounded, preventing memory exhaustion under DDoS
  if (ipBlockCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = ipBlockCache.keys().next().value;
    if (oldestKey) ipBlockCache.delete(oldestKey);
  }
  ipBlockCache.set(ip, { blocked, expiresAt: Date.now() + IP_CACHE_TTL_MS });
}

// Cleanup stale cache entries every 10 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipBlockCache.entries()) {
    if (now > entry.expiresAt) ipBlockCache.delete(ip);
  }
}, 10 * 60 * 1000);

// ─── 1. General API Rate Limiter ─────────────────────────────────────────────
// 500 users, each placing 1 order = ~500 requests.
// 300 per IP per 15 min is correct — prevents single-user abuse without blocking real students.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// ─── 2. Sensitive Action Rate Limiter (Auth & Orders) ────────────────────────
// Campus scenario: a student might retry order 2-3 times in a rush.
// 10 per minute is safe — blocks bots but allows legit retries.
const orderLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 10,
  message: { success: false, message: 'Order velocity limit exceeded. Please wait a minute before retrying.' }
});

// ─── 3. Auth-Specific Brute Force Limiter ─────────────────────────────────────
// Separate from general limiter — tighter limits for login endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // 20 login attempts per IP per 15 mins
  message: { success: false, message: 'Too many login attempts. Please try again in 15 minutes.' }
});

// ─── 4. Honeypot & Threat Check Middleware (with IP Cache) ───────────────────
async function antiBotCheck(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = ip.split(',')[0].trim().replace(/^.*:(?!.*:)/, ''); // handles IPv4-mapped IPv6

  try {
    // Scalability Fix: Check in-memory cache first (O(1)) before DB query
    const cachedBlock = getCachedIpBlock(cleanIp);

    if (cachedBlock === true) {
      return res.status(403).json({
        success: false,
        message: 'Access blocked by 2 Roti Security Subsystem. Suspicious activity detected.'
      });
    }

    // Only hit DB if cache miss (first request from this IP)
    if (cachedBlock === null) {
      const blockEntry = await db('security_audit_logs')
        .where({ ip_address: cleanIp, is_blocked: true })
        .first();

      const isBlocked = !!blockEntry;
      setCachedIpBlock(cleanIp, isBlocked);

      if (isBlocked) {
        return res.status(403).json({
          success: false,
          message: 'Access blocked by 2 Roti Security Subsystem. Suspicious activity detected.'
        });
      }
    }

    // Check Honeypot field in POST/PUT
    if (req.body && req.body._hp_trap && req.body._hp_trap.trim().length > 0) {
      // Bot trapped! Update cache immediately
      setCachedIpBlock(cleanIp, true);

      await db('security_audit_logs').insert({
        ip_address: cleanIp,
        user_agent: req.headers['user-agent'] || 'Unknown',
        endpoint: req.originalUrl,
        action: 'HONEYPOT_TRIPPED',
        threat_score: 100,
        is_blocked: true,
        details: JSON.stringify({ field: '_hp_trap', value: req.body._hp_trap })
      });

      return res.status(403).json({
        success: false,
        message: 'Automated submission blocked.'
      });
    }

    next();
  } catch (err) {
    console.error('AntiBot check error:', err);
    next(); // Fall through gracefully — never block legitimate users due to our own error
  }
}

module.exports = {
  apiLimiter,
  orderLimiter,
  authLimiter,
  antiBotCheck,
  setCachedIpBlock
};
