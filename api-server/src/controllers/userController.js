const bcrypt = require('bcryptjs');
const db = require('../config/database');

// 1. Get Customers Directory (Admin)
async function getCustomers(req, res) {
  try {
    const { campus, search } = req.query;

    let query = db('users')
      .leftJoin('locations', 'users.default_location_id', 'locations.id')
      .select('users.*', 'locations.name as campus_name')
      .orderBy('users.created_at', 'desc');

    if (campus && campus !== 'ALL') {
      query = query.where('locations.name', campus);
    }

    if (search) {
      query = query.where(function() {
        this.where('users.name', 'like', `%${search}%`)
          .orWhere('users.phone_number', 'like', `%${search}%`)
          .orWhere('users.email', 'like', `%${search}%`);
      });
    }

    const customers = await query.limit(100);

    return res.json({
      success: true,
      customers: customers.map(c => ({
        ...c,
        wallet_balance: parseFloat(c.wallet_balance || 0)
      }))
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customer directory.' });
  }
}

// 2. Toggle Customer Status (Active / Blocked)
async function toggleCustomerStatus(req, res) {
  try {
    const { id } = req.params;
    const user = await db('users').where({ id }).first();
    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer not found.' });
    }

    const newStatus = user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
    await db('users').where({ id }).update({ status: newStatus, updated_at: db.fn.now() });

    return res.json({
      success: true,
      message: `Customer account is now ${newStatus}.`,
      status: newStatus
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to toggle status.' });
  }
}

// 3. Get Staff List (Super Admin Only)
async function getStaffList(req, res) {
  try {
    const staff = await db('staff_users')
      .leftJoin('locations', 'staff_users.outlet_location_id', 'locations.id')
      .select('staff_users.id', 'staff_users.name', 'staff_users.email', 'staff_users.phone', 'staff_users.role', 'staff_users.is_active', 'staff_users.created_at', 'locations.name as outlet_name')
      .orderBy('staff_users.id', 'asc');

    return res.json({ success: true, staff });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch staff list.' });
  }
}

// 4. Create Staff Account (RBAC: Super Admin creates Order Manager or Vendor)
async function createStaffUser(req, res) {
  try {
    const { name, email, phone, password, role, outlet_location_id } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }

    const validRoles = ['SUPER_ADMIN', 'ORDER_MANAGER', 'VENDOR'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const existing = await db('staff_users').where({ email: email.toLowerCase().trim() }).first();
    if (existing) {
      return res.status(400).json({ success: false, message: 'A staff member with this email already exists.' });
    }

    const passHash = await bcrypt.hash(password, 10);

    const [staffId] = await db('staff_users').insert({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : null,
      password_hash: passHash,
      role,
      outlet_location_id: role === 'VENDOR' ? (outlet_location_id || null) : null,
      is_active: true
    });

    const created = await db('staff_users').where({ id: staffId }).first();

    return res.json({
      success: true,
      message: `${role} account created successfully!`,
      staff: {
        id: created.id,
        name: created.name,
        email: created.email,
        role: created.role
      }
    });
  } catch (err) {
    console.error('createStaffUser error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create staff account.' });
  }
}

module.exports = {
  getCustomers,
  toggleCustomerStatus,
  getStaffList,
  createStaffUser
};
