const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_2roti_secure_2026_jwt';

// General token extractor (Cookies preferred, header fallback)
function extractToken(req) {
  if (req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
}

// Authenticate Customer
async function requireCustomer(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'CUSTOMER') {
      return res.status(403).json({ success: false, message: 'Invalid token type for customer route.' });
    }

    const user = await db('users').where({ id: decoded.userId }).first();
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or account removed.' });
    }

    if (user.status === 'BLOCKED') {
      return res.status(403).json({ success: false, message: 'Account is blocked. Contact support.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
}

// Authenticate Staff (Super Admin, Order Manager, Vendor)
function requireStaffRole(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ success: false, message: 'Staff authentication required.' });
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.type !== 'STAFF') {
        return res.status(403).json({ success: false, message: 'Staff credentials required.' });
      }

      const staff = await db('staff_users').where({ id: decoded.staffId }).first();
      if (!staff || !staff.is_active) {
        return res.status(403).json({ success: false, message: 'Staff user inactive or not found.' });
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(staff.role)) {
        return res.status(403).json({ 
          success: false, 
          message: `Access denied. Route requires [${allowedRoles.join(', ')}], your role is ${staff.role}.` 
        });
      }

      req.staff = staff;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired staff token.' });
    }
  };
}

module.exports = {
  requireCustomer,
  requireStaffRole
};
