const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { verifyFirebaseToken } = require('../config/firebaseAdmin');

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

      const inserted = await db('users').insert({
        phone_number: cleanPhone,
        name: name || null,
        email: email || null,
        password_hash: passHash,
        firebase_uid: firebaseUid || null,
        is_profile_complete: false,
        wallet_balance: 0.00,
        status: 'ACTIVE'
      }).returning('id');
      
      const userId = (Array.isArray(inserted) ? (inserted[0].id || inserted[0]) : inserted) || inserted[0];

      user = await db('users').where({ id: userId }).first();
    } else {
      // User exists. If account has a password, it MUST be verified
      if (user.password_hash) {
        if (!password) {
          return res.status(401).json({ success: false, message: 'Password is required to authenticate.' });
        }
        const matches = await bcrypt.compare(password, user.password_hash);
        if (!matches) {
          return res.status(401).json({ success: false, message: 'Incorrect password.' });
        }
      } else if (!password && !firebaseUid) {
        return res.status(400).json({ success: false, message: 'Authentication credential required.' });
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

// 2. Customer Firebase Google Sign-In
async function firebaseCustomerAuth(req, res) {
  try {
    const { idToken, email, name, firebaseUid } = req.body;

    let uid = null;
    let userEmail = null;
    let userName = name ? String(name).trim().substring(0, 50).replace(/[<>]/g, '') : null;

    // Cryptographic Token Verification
    if (idToken) {
      try {
        const decoded = await verifyFirebaseToken(idToken);
        if (decoded) {
          uid = decoded.uid || decoded.user_id || decoded.sub;
          userEmail = decoded.email ? String(decoded.email).toLowerCase().trim() : null;
          userName = decoded.name || userName;
        }
      } catch (tokenErr) {
        console.warn('Firebase token verification failed:', tokenErr.message);
        return res.status(401).json({ success: false, message: 'Google Authentication token invalid or expired.' });
      }
    } else if (process.env.NODE_ENV !== 'production' && firebaseUid && email && String(firebaseUid).startsWith('google_demo_')) {
      // Isolated development-only fallback for 1-click test flow
      uid = firebaseUid;
      userEmail = String(email).toLowerCase().trim();
    } else {
      return res.status(400).json({ success: false, message: 'Google ID Token is mandatory.' });
    }

    if (!userEmail && !uid) {
      return res.status(400).json({ success: false, message: 'Unable to resolve user identity from Google token.' });
    }

    // Find existing user by firebase_uid or email
    let user = null;
    if (uid) {
      user = await db('users').where({ firebase_uid: uid }).first();
    }
    if (!user && userEmail) {
      user = await db('users').where({ email: userEmail }).first();
      if (user && uid) {
        await db('users').where({ id: user.id }).update({ firebase_uid: uid });
      }
    }

    if (!user) {
      // Create new customer from Google account
      const tempPhone = `PENDING_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const inserted = await db('users').insert({
        firebase_uid: uid || null,
        email: userEmail || null,
        name: userName || 'Google User',
        phone_number: tempPhone,
        is_profile_complete: false,
        wallet_balance: 0.00,
        status: 'ACTIVE'
      }).returning('id');
      const newUserId = (Array.isArray(inserted) ? (inserted[0].id || inserted[0]) : inserted) || inserted[0];
      user = await db('users').where({ id: newUserId }).first();
    }

    if (user.status === 'BLOCKED') {
      return res.status(403).json({ success: false, message: 'Your account is deactivated. Please contact support.' });
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

    await db('sessions').insert({
      user_id: user.id,
      refresh_token_hash: await bcrypt.hash(refreshToken, 6),
      user_agent: req.headers['user-agent'] || 'Unknown',
      ip_address: req.ip,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    setAuthCookies(res, accessToken, refreshToken);

    const isTempPhone = !user.phone_number || user.phone_number.startsWith('PENDING_');
    const isProfileComplete = !isTempPhone && Boolean(user.is_profile_complete) && Boolean(user.default_location_id);

    return res.json({
      success: true,
      message: 'Logged in with Google successfully!',
      token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        phone: isTempPhone ? null : user.phone_number,
        email: user.email,
        default_location_id: user.default_location_id,
        is_profile_complete: isProfileComplete,
        wallet_balance: parseFloat(user.wallet_balance || 0)
      }
    });
  } catch (err) {
    console.error('Firebase Customer Auth error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during Google authentication.' });
  }
}

// 3. Profile Onboarding Update (Compulsory Mobile + Campus Selection)
async function completeProfile(req, res) {
  try {
    const { name, location_id, email, phone } = req.body;
    const userId = req.user.id;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full Name is required.' });
    }
    const cleanName = name.trim().substring(0, 50).replace(/[<>]/g, '');

    if (!location_id) {
      return res.status(400).json({ success: false, message: 'Please select your Campus delivery location.' });
    }

    const currentUser = await db('users').where({ id: userId }).first();
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let finalPhone = currentUser.phone_number;
    const isTemp = !finalPhone || finalPhone.startsWith('PENDING_');

    // Phone is compulsory if not previously set with a valid 10-digit number
    if (isTemp || phone) {
      if (!phone) {
        return res.status(400).json({ success: false, message: 'Mobile number is mandatory for campus deliveries.' });
      }
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      if (cleanPhone.length !== 10) {
        return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
      }

      // Check if another customer already has this mobile number
      const duplicate = await db('users')
        .where({ phone_number: cleanPhone })
        .whereNot({ id: userId })
        .first();

      if (duplicate) {
        return res.status(400).json({ success: false, message: 'This mobile number is already registered with another account.' });
      }
      finalPhone = cleanPhone;
    }

    const location = await db('locations').where({ id: location_id, is_active: true }).first();
    if (!location) {
      return res.status(400).json({ success: false, message: 'Selected campus location is invalid.' });
    }

    await db('users').where({ id: userId }).update({
      name: cleanName,
      phone_number: finalPhone,
      email: email ? email.trim() : currentUser.email,
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

// 4. Customer Get Me
async function getCustomerMe(req, res) {
  try {
    const user = await db('users').where({ id: req.user.id }).first();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    let locationName = null;
    if (user.default_location_id) {
      const loc = await db('locations').where({ id: user.default_location_id }).first();
      if (loc) locationName = loc.name;
    }

    const isTempPhone = !user.phone_number || user.phone_number.startsWith('PENDING_');
    const isComplete = !isTempPhone && Boolean(user.is_profile_complete) && Boolean(user.default_location_id);

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: isTempPhone ? null : user.phone_number,
        email: user.email,
        default_location_id: user.default_location_id,
        location_name: locationName,
        is_profile_complete: isComplete,
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
  firebaseCustomerAuth,
  completeProfile,
  getCustomerMe,
  staffLogin,
  getStaffMe,
  logout
};
