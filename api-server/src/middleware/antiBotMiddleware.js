const rateLimit = require('express-rate-limit');
const db = require('../config/database');

// 1. General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again after 15 minutes.' }
});

// 2. Sensitive Action Rate Limiter (Auth & Orders)
const orderLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  max: 10,
  message: { success: false, message: 'Order velocity limit exceeded. Please wait a minute before retrying.' }
});

// 3. Honeypot & Threat Check Middleware
async function antiBotCheck(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const cleanIp = ip.replace(/^.*:/, '');

  try {
    // Check if IP is currently blocked
    const blockEntry = await db('security_audit_logs')
      .where({ ip_address: cleanIp, is_blocked: true })
      .first();

    if (blockEntry) {
      return res.status(403).json({
        success: false,
        message: 'Access blocked by 2 Roti Security Subsystem. Suspicious activity detected.'
      });
    }

    // Check Honeypot field in POST/PUT
    if (req.body && req.body._hp_trap && req.body._hp_trap.trim().length > 0) {
      // Bot trapped!
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
    next(); // Fall through gracefully
  }
}

module.exports = {
  apiLimiter,
  orderLimiter,
  antiBotCheck
};
