const db = require('../config/database');
const { setCachedIpBlock } = require('../middleware/antiBotMiddleware');

// 1. Get Security Overview & Logs
async function getSecurityOverview(req, res) {
  try {
    // Concurrency Optimization: Run independent queries in parallel via Promise.all
    const [logs, blockedIps, honeypotHits] = await Promise.all([
      db('security_audit_logs').orderBy('created_at', 'desc').limit(50),
      db('security_audit_logs')
        .where({ is_blocked: true })
        .distinct('ip_address', 'action', 'created_at'),
      db('security_audit_logs')
        .where({ action: 'HONEYPOT_TRIPPED' })
        .count('id as cnt')
        .first()
    ]);

    return res.json({
      success: true,
      security: {
        honeypot_triggers_count: parseInt(honeypotHits.cnt) || 0,
        total_blocked_ips: blockedIps.length,
        blocked_ips: blockedIps,
        recent_logs: logs
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch security stats.' });
  }
}

// 2. Block IP Manually
async function blockIp(req, res) {
  try {
    const { ip, reason } = req.body;
    if (!ip) {
      return res.status(400).json({ success: false, message: 'IP address required.' });
    }

    const cleanIp = ip.trim();
    // Update real-time in-memory cache instantly (O(1))
    setCachedIpBlock(cleanIp, true);

    await db('security_audit_logs').insert({
      ip_address: cleanIp,
      endpoint: '/admin/manual-block',
      action: 'MANUAL_ADMIN_BLOCK',
      threat_score: 100,
      is_blocked: true,
      details: JSON.stringify({ reason: reason || 'Manual block by Super Admin' })
    });

    return res.json({ success: true, message: `IP ${cleanIp} blocked successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to block IP.' });
  }
}

// 3. Unblock IP
async function unblockIp(req, res) {
  try {
    const { ip } = req.body;
    if (!ip) {
      return res.status(400).json({ success: false, message: 'IP address required.' });
    }

    const cleanIp = ip.trim();
    // Invalidate in-memory cache instantly (O(1))
    setCachedIpBlock(cleanIp, false);

    await db('security_audit_logs').where({ ip_address: cleanIp }).update({ is_blocked: false });

    return res.json({ success: true, message: `IP ${cleanIp} unblocked.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to unblock IP.' });
  }
}

module.exports = {
  getSecurityOverview,
  blockIp,
  unblockIp
};
