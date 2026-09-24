const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_2roti_secure_2026_jwt';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'super_secret_refresh_jwt_key_2roti_2026';

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  });

  if (refreshToken) {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }
}

// 1. Customer Phone & OTP / Password Auth
async function customerAuth(req, res) {
  try {
    const { phone, name, email, password, firebaseUid } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is mandatory.' });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10); // Standard 10 digits
    if (cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    let user = await db('users').where({ phone_number: cleanPhone }).first();

    if (!user) {
      // Create new customer
      let passHash = null;
      if (password) {
        passHash = await bcrypt.hash(password, 10);
      }

      const [userId] = await db('users').insert({
        phone_number: cleanPhone,
        name: name || null,
        email: email || null,
        password_hash: passHash,
        firebase_uid: firebaseUid || null,
        is_profile_complete: false,
        wallet_balance: 0.00,
        status: 'ACTIVE'
      });

      user = await db('users').where({ id: userId }).first();
    } else {
      // User exists. If password provided and user has password, check it
      if (password && user.password_hash) {
        const matches = await bcrypt.compare(password, user.password_hash);
        if (!matches) {
          return res.status(401).json({ success: false, message: 'Incorrect password.' });
        }
      }
      if (firebaseUid && !user.firebase_uid) {
        await db('users').where({ id: user.id }).update({ firebase_uid: firebaseUid });
      }
    }

    const accessToken = jwt.sign(
      { userId: user.id, type: 'CUSTOMER', phone: user.phone_number },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: 'CUSTOMER' },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    // Save session
    await db('sessions').insert({
      user_id: user.id,
      refresh_token_hash: await bcrypt.hash(refreshToken, 6),
      user_agent: req.headers['user-agent'] || 'Unknown',
      ip_address: req.ip,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    setAuthCookies(res, accessToken, refreshToken);

    return res.json({
      success: true,
      message: 'Authenticated successfully',
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone_number,
        email: user.email,
        default_location_id: user.default_location_id,
        is_profile_complete: !!user.is_profile_complete,
        wallet_balance: parseFloat(user.wallet_balance || 0)
      }
    });
  } catch (err) {
    console.error('Customer Auth error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
  }
}

// 2. Profile Onboarding Update
async function completeProfile(req, res) {
  try {
    const { name, location_id, email } = req.body;
    const userId = req.user.id;

    if (!name || !location_id) {
      return res.status(400).json({ success: false, message: 'Name and Campus location are required.' });
    }

    const location = await db('locations').where({ id: location_id, is_active: true }).first();
    if (!location) {
      return res.status(400).json({ success: false, message: 'Selected campus location is invalid.' });
    }

    await db('users').where({ id: userId }).update({
      name: name.trim(),
      email: email ? email.trim() : req.user.email,
      default_location_id: location_id,
      is_profile_complete: true,
      updated_at: db.fn.now()
    });

    const updatedUser = await db('users').where({ id: userId }).first();

    return res.json({
      success: true,
      message: 'Profile completed successfully!',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone_number,
        email: updatedUser.email,
        default_location_id: updatedUser.default_location_id,
        location_name: location.name,
        is_profile_complete: true,
        wallet_balance: parseFloat(updatedUser.wallet_balance || 0)
      }
    });
  } catch (err) {
    console.error('Complete Profile error:', err);
    return res.status(500).json({ success: false, message: 'Error updating profile.' });
  }
}

// 3. Customer Get Me
async function getCustomerMe(req, res) {
  try {
    const user = await db('users').where({ id: req.user.id }).first();
    let locationName = null;
    if (user.default_location_id) {
      const loc = await db('locations').where({ id: user.default_location_id }).first();
      if (loc) locationName = loc.name;
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone_number,
        email: user.email,
        default_location_id: user.default_location_id,
        location_name: locationName,
        is_profile_complete: !!user.is_profile_complete,
        wallet_balance: parseFloat(user.wallet_balance || 0)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
}

// 4. Staff Login (Admin, Order Manager, Vendor)
async function staffLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required.' });
    }

    const staff = await db('staff_users').where({ email: email.toLowerCase().trim() }).first();
    if (!staff || !staff.is_active) {
      return res.status(401).json({ success: false, message: 'Invalid staff credentials or account disabled.' });
    }

    const validPass = await bcrypt.compare(password, staff.password_hash);
    if (!validPass) {
      return res.status(401).json({ success: false, message: 'Invalid staff credentials.' });
    }

    const accessToken = jwt.sign(
      { staffId: staff.id, role: staff.role, type: 'STAFF' },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { staffId: staff.id, type: 'STAFF' },
      REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    setAuthCookies(res, accessToken, refreshToken);

    let outletName = null;
    if (staff.outlet_location_id) {
      const loc = await db('locations').where({ id: staff.outlet_location_id }).first();
      if (loc) outletName = loc.name;
    }

    return res.json({
      success: true,
      message: 'Staff login successful',
      token: accessToken,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        outlet_location_id: staff.outlet_location_id,
        outlet_name: outletName
      }
    });
  } catch (err) {
    console.error('Staff Login error:', err);
    return res.status(500).json({ success: false, message: 'Staff login failed.' });
  }
}

// 5. Staff Get Me
async function getStaffMe(req, res) {
  try {
    const staff = req.staff;
    let outletName = null;
    if (staff.outlet_location_id) {
      const loc = await db('locations').where({ id: staff.outlet_location_id }).first();
      if (loc) outletName = loc.name;
    }

    return res.json({
      success: true,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        outlet_location_id: staff.outlet_location_id,
        outlet_name: outletName
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch staff info.' });
  }
}

// 6. Logout
async function logout(req, res) {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  return res.json({ success: true, message: 'Logged out successfully.' });
}

module.exports = {
  customerAuth,
  completeProfile,
  getCustomerMe,
  staffLogin,
  getStaffMe,
  logout
};
