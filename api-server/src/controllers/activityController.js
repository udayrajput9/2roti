const db = require('../config/database');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || '2roti-dev-secret-key-change-in-prod';

// Helper: Get start of today in IST (UTC+5:30)
function getStartOfTodayIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  return new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate()) - istOffset);
}

// 1-Day Auto-Deletion Routine: Remove activity logs older than 24 hours
async function cleanupOldLogs() {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deletedCount = await db('user_activity_logs')
      .where('created_at', '<', cutoff)
      .del();
    if (deletedCount > 0) {
      console.log(`🧹 Auto-cleanup: Pruned ${deletedCount} activity logs older than 24 hours.`);
    }
  } catch (err) {
    console.warn('cleanupOldLogs warning:', err.message);
  }
}

// 1. Public Event Tracking Endpoint (POST /api/activity/track)
async function trackEvent(req, res) {
  try {
    const { session_id, event_type, page, metadata, user_id, user_email, user_name } = req.body;

    if (!session_id || !event_type) {
      return res.status(400).json({ success: false, message: 'session_id and event_type are required.' });
    }

    // Try extracting authenticated user from cookie if available
    let resolvedUserId = user_id || null;
    let resolvedEmail = user_email || null;
    let resolvedName = user_name || null;

    if (!resolvedUserId && req.cookies && req.cookies.access_token) {
      try {
        const decoded = jwt.verify(req.cookies.access_token, JWT_SECRET);
        if (decoded && decoded.userId) {
          resolvedUserId = decoded.userId;
        }
      } catch (e) {
        // Ignore invalid/expired token during tracking
      }
    }

    // If we have userId but missing name/email, optionally query
    if (resolvedUserId && (!resolvedEmail || !resolvedName)) {
      try {
        const u = await db('users').where({ id: resolvedUserId }).select('name', 'email').first();
        if (u) {
          resolvedEmail = resolvedEmail || u.email;
          resolvedName = resolvedName || u.name;
        }
      } catch (e) {}
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'Unknown';
    const userAgent = req.headers['user-agent'] ? req.headers['user-agent'].substring(0, 500) : null;

    let metaString = null;
    if (metadata) {
      metaString = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
    }

    await db('user_activity_logs').insert({
      session_id: String(session_id).substring(0, 100),
      user_id: resolvedUserId,
      user_email: resolvedEmail ? String(resolvedEmail).substring(0, 255) : null,
      user_name: resolvedName ? String(resolvedName).substring(0, 255) : null,
      event_type: String(event_type).substring(0, 50),
      page: page ? String(page).substring(0, 100) : null,
      metadata: metaString,
      ip_address: String(ip).substring(0, 64),
      user_agent: userAgent,
      created_at: db.fn.now()
    });

    // Throttled 1-day auto-pruning (approx 5% of requests)
    if (Math.random() < 0.05) {
      cleanupOldLogs().catch(() => {});
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('trackEvent error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to record activity.' });
  }
}

// 2. Admin Activity Overview (GET /api/admin/activity/overview)
// Strictly PER-DAY (Today in IST). Previous days are excluded.
async function getActivityOverview(req, res) {
  try {
    // Run cleanup on demand so logs older than 24h are purged
    await cleanupOldLogs();

    const startOfToday = getStartOfTodayIST();
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Parallel aggregate queries for today
    const [
      visitsRow,
      pageViewsRow,
      activeNowRow,
      cartAddsRow,
      pageBreakdownRows,
      cartEventsToday,
      recentActivityRows
    ] = await Promise.all([
      // Total unique visitor sessions today
      db('user_activity_logs')
        .where('created_at', '>=', startOfToday)
        .where('event_type', 'PAGE_VIEW')
        .countDistinct('session_id as count')
        .first(),

      // Total page views today
      db('user_activity_logs')
        .where('created_at', '>=', startOfToday)
        .where('event_type', 'PAGE_VIEW')
        .count('id as count')
        .first(),

      // Active visitor sessions in last 15 minutes
      db('user_activity_logs')
        .where('created_at', '>=', fifteenMinsAgo)
        .countDistinct('session_id as count')
        .first(),

      // Cart additions today
      db('user_activity_logs')
        .where('created_at', '>=', startOfToday)
        .where('event_type', 'CART_ADD')
        .count('id as count')
        .first(),

      // Page breakdown today
      db('user_activity_logs')
        .where('created_at', '>=', startOfToday)
        .where('event_type', 'PAGE_VIEW')
        .select('page')
        .count('id as views')
        .groupBy('page')
        .orderBy('views', 'desc'),

      // Cart add events today for item-level aggregation
      db('user_activity_logs')
        .where('created_at', '>=', startOfToday)
        .where('event_type', 'CART_ADD')
        .select('metadata', 'user_name', 'session_id', 'created_at')
        .orderBy('created_at', 'desc')
        .limit(100),

      // Recent 50 activities today
      db('user_activity_logs')
        .where('created_at', '>=', startOfToday)
        .select('id', 'session_id', 'user_id', 'user_name', 'user_email', 'event_type', 'page', 'metadata', 'created_at')
        .orderBy('created_at', 'desc')
        .limit(50)
    ]);

    // Aggregate top cart items today
    const itemCounts = {};
    const cartActivityFeed = [];

    cartEventsToday.forEach(evt => {
      try {
        const data = typeof evt.metadata === 'string' ? JSON.parse(evt.metadata) : (evt.metadata || {});
        const itemName = data.itemName || data.name || 'Unknown Dish';
        const qty = parseInt(data.quantity || 1);
        const price = parseFloat(data.price || 0);

        if (!itemCounts[itemName]) {
          itemCounts[itemName] = { itemName, count: 0, totalQty: 0, price };
        }
        itemCounts[itemName].count += 1;
        itemCounts[itemName].totalQty += qty;

        cartActivityFeed.push({
          user: evt.user_name || `Visitor (${evt.session_id.slice(-6)})`,
          itemName,
          quantity: qty,
          price,
          time: evt.created_at
        });
      } catch (e) {}
    });

    const topItemsToday = Object.values(itemCounts)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 10);

    return res.json({
      success: true,
      today: {
        date: startOfToday.toISOString(),
        total_unique_visitors: parseInt(visitsRow?.count || 0),
        total_page_views: parseInt(pageViewsRow?.count || 0),
        active_visitors_now: parseInt(activeNowRow?.count || 0),
        total_cart_additions: parseInt(cartAddsRow?.count || 0)
      },
      page_views_breakdown: pageBreakdownRows.map(r => ({
        page: r.page || 'home',
        views: parseInt(r.views || 0)
      })),
      top_items_today: topItemsToday,
      recent_cart_actions: cartActivityFeed.slice(0, 20),
      recent_events: recentActivityRows.map(r => ({
        ...r,
        metadata: typeof r.metadata === 'string' ? (() => { try { return JSON.parse(r.metadata); } catch(e) { return r.metadata; } })() : r.metadata
      }))
    });
  } catch (err) {
    console.error('getActivityOverview error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch activity overview.' });
  }
}

// 3. Admin Onboarding Drop-offs (GET /api/admin/activity/dropoffs)
async function getOnboardingDropoffs(req, res) {
  try {
    const startOfToday = getStartOfTodayIST();

    // Query all incomplete / pending phone users
    const dropoffUsers = await db('users')
      .where(function() {
        this.where('is_profile_complete', false)
          .orWhere('phone_number', 'like', 'PENDING_%')
          .orWhereNull('phone_number');
      })
      .select('id', 'name', 'email', 'phone_number', 'created_at', 'updated_at', 'status')
      .orderBy('created_at', 'desc')
      .limit(100);

    // Total stats
    const [totalUsersRow, totalCompletedRow, totalTodayUsersRow, todayCompletedRow] = await Promise.all([
      db('users').count('id as count').first(),
      db('users').where({ is_profile_complete: true }).whereNot('phone_number', 'like', 'PENDING_%').count('id as count').first(),
      db('users').where('created_at', '>=', startOfToday).count('id as count').first(),
      db('users').where('created_at', '>=', startOfToday).where({ is_profile_complete: true }).whereNot('phone_number', 'like', 'PENDING_%').count('id as count').first()
    ]);

    const totalUsers = parseInt(totalUsersRow?.count || 0);
    const totalCompleted = parseInt(totalCompletedRow?.count || 0);
    const totalDropoffs = Math.max(0, totalUsers - totalCompleted);

    const todayUsers = parseInt(totalTodayUsersRow?.count || 0);
    const todayCompleted = parseInt(todayCompletedRow?.count || 0);
    const todayDropoffs = Math.max(0, todayUsers - todayCompleted);

    const enrichedUsers = dropoffUsers.map(u => {
      const isToday = new Date(u.created_at) >= startOfToday;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone_number: u.phone_number,
        status: u.status,
        created_at: u.created_at,
        is_today: isToday
      };
    });

    return res.json({
      success: true,
      stats: {
        today_signups: todayUsers,
        today_completed: todayCompleted,
        today_dropoffs: todayDropoffs,
        today_dropoff_rate: todayUsers > 0 ? ((todayDropoffs / todayUsers) * 100).toFixed(1) + '%' : '0%',
        all_time_dropoffs: totalDropoffs,
        all_time_completed: totalCompleted
      },
      dropoffs: enrichedUsers
    });
  } catch (err) {
    console.error('getOnboardingDropoffs error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch drop-offs.' });
  }
}

module.exports = {
  cleanupOldLogs,
  trackEvent,
  getActivityOverview,
  getOnboardingDropoffs
};
