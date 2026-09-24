/**
 * 2 Roti Enterprise Comprehensive API Test Suite (Updated with Exact Endpoints)
 * 
 * Tests across 7 Critical Dimensions:
 * 1. Health & Public Settings Parameters
 * 2. Menu & Inventory Read Parameters
 * 3. Auth, JWT & RBAC Parameters
 * 4. Order Logic, Cart Cap & Price Tampering Parameters
 * 5. Wallet Row-Locking & Double-Spend Concurrency Parameters
 * 6. Admin / Vendor Analytics Parameters
 * 7. Latency & Response Time Benchmarking
 */

const BASE_URL = 'http://localhost:5000';

const results = [];

function recordTest(category, name, passed, durationMs, details = '') {
  results.push({ category, name, passed, durationMs, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${category}] ${name} (${durationMs}ms)${details ? ' - ' + details : ''}`);
}

async function request(path, options = {}) {
  const start = Date.now();
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  
  try {
    const res = await fetch(url, { ...options, headers });
    const duration = Date.now() - start;
    let data;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
    return { status: res.status, ok: res.ok, data, duration, headers: res.headers };
  } catch (err) {
    const duration = Date.now() - start;
    return { status: 0, ok: false, error: err.message, duration };
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('       2 ROTI ENTERPRISE COMPREHENSIVE API TEST SUITE          ');
  console.log('===============================================================\n');

  let customerToken = null;
  let customerUser = null;
  let adminToken = null;
  let vendorToken = null;
  let sampleLocation = null;
  let sampleItem = null;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Health & Settings Parameter
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const res = await request('/api/health');
    const passed = res.status === 200 && res.data?.status === 'HEALTHY' && res.data?.db_status === 'CONNECTED';
    recordTest('Health', 'GET /api/health (DB Connected & Server Healthy)', passed, res.duration, `DB: ${res.data?.db_status}`);
  }

  {
    const res = await request('/api/settings');
    const passed = res.status === 200 && res.data?.success && res.data?.settings?.delivery_fee !== undefined;
    recordTest('Settings', 'GET /api/settings (Public System Configurations)', passed, res.duration, `Delivery Fee: ₹${res.data?.settings?.delivery_fee}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Menu & Inventory Parameters
  // ─────────────────────────────────────────────────────────────────────────────
  {
    const res = await request('/api/menu/locations');
    const passed = res.status === 200 && res.data?.success && Array.isArray(res.data?.locations) && res.data.locations.length > 0;
    if (passed) sampleLocation = res.data.locations[0];
    recordTest('Menu', 'GET /api/menu/locations (Active Campus Locations)', passed, res.duration, `Found ${res.data?.locations?.length} locations`);
  }

  {
    const res = await request('/api/menu');
    const passed = res.status === 200 && res.data?.success && res.data?.menu?.All?.length > 0;
    if (passed) {
      sampleItem = res.data.menu.All.find(i => !i.is_outlet_only) || res.data.menu.All[0];
    }
    recordTest('Menu', 'GET /api/menu (Categorized Delivery Menu)', passed, res.duration, `Found ${res.data?.menu?.All?.length} items`);
  }

  {
    const res = await request('/api/menu/outlet');
    const passed = res.status === 200 && res.data?.success && Array.isArray(res.data?.items);
    recordTest('Menu', 'GET /api/menu/outlet (Outlet Specials)', passed, res.duration, `Found ${res.data?.items?.length} outlet items`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Authentication & RBAC Parameters
  // ─────────────────────────────────────────────────────────────────────────────
  const testPhone = '99999' + Math.floor(10000 + Math.random() * 90000);
  const testPassword = 'TestPassword@123';

  // 3.1 Invalid Phone Validation
  {
    const res = await request('/api/auth/customer', {
      method: 'POST',
      body: JSON.stringify({ phone: '123' })
    });
    const passed = res.status === 400 && !res.data?.success;
    recordTest('Auth', 'POST /api/auth/customer (Reject Invalid Phone)', passed, res.duration, res.data?.message);
  }

  // 3.2 Valid Customer Registration & Login
  {
    const res = await request('/api/auth/customer', {
      method: 'POST',
      body: JSON.stringify({ phone: testPhone, password: testPassword, name: 'Test Student' })
    });
    const passed = res.status === 200 && res.data?.success && !!res.data?.token;
    if (passed) {
      customerToken = res.data.token;
      customerUser = res.data.user;
    }
    recordTest('Auth', 'POST /api/auth/customer (Register / Authenticate Customer)', passed, res.duration, `User ID: ${customerUser?.id}`);
  }

  // 3.3 Verify Wrong Password Rejection
  {
    const res = await request('/api/auth/customer', {
      method: 'POST',
      body: JSON.stringify({ phone: testPhone, password: 'WrongPassword999' })
    });
    const passed = res.status === 401 && !res.data?.success;
    recordTest('Auth', 'POST /api/auth/customer (Reject Incorrect Password)', passed, res.duration, res.data?.message);
  }

  // 3.4 Protected Customer Route with JWT
  {
    const res = await request('/api/auth/customer/me', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const passed = res.status === 200 && res.data?.success && res.data?.user?.phone === testPhone;
    recordTest('Auth', 'GET /api/auth/customer/me (Verify Valid JWT Session)', passed, res.duration, `Phone: ${res.data?.user?.phone}`);
  }

  // 3.5 Protected Route without JWT (Reject 401)
  {
    const res = await request('/api/auth/customer/me');
    const passed = res.status === 401 && !res.data?.success;
    recordTest('Auth', 'GET /api/auth/customer/me (Reject Missing JWT)', passed, res.duration, res.data?.message);
  }

  // 3.6 Complete Profile
  if (sampleLocation) {
    const res = await request('/api/auth/complete-profile', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: JSON.stringify({
        name: 'Verified Campus Student',
        location_id: sampleLocation.id,
        email: `student_${Date.now()}@campus.edu`
      })
    });
    const passed = res.status === 200 && res.data?.success;
    recordTest('Auth', 'POST /api/auth/complete-profile (Save Profile & Location)', passed, res.duration);
  }

  // 3.7 Staff Super Admin Login
  {
    const res = await request('/api/auth/staff/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@2roti.com', password: 'Admin@2Roti2026' })
    });
    const passed = res.status === 200 && res.data?.success && !!res.data?.token && res.data?.staff?.role === 'SUPER_ADMIN';
    if (passed) adminToken = res.data.token;
    recordTest('Auth', 'POST /api/auth/staff/login (Super Admin Login)', passed, res.duration, `Role: ${res.data?.staff?.role}`);
  }

  // 3.8 Staff Vendor Login
  {
    const res = await request('/api/auth/staff/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'vendor.jhungiya@2roti.com', password: 'Vendor@2Roti2026' })
    });
    const passed = res.status === 200 && res.data?.success && !!res.data?.token && res.data?.staff?.role === 'VENDOR';
    if (passed) vendorToken = res.data.token;
    recordTest('Auth', 'POST /api/auth/staff/login (Vendor Login)', passed, res.duration, `Role: ${res.data?.staff?.role}`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Order Logic, Cart Validation & Price Integrity Parameters
  // ─────────────────────────────────────────────────────────────────────────────
  if (sampleItem && sampleLocation && customerToken) {
    // 4.1 Empty Cart Rejection
    {
      const res = await request('/api/orders/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({ items: [], location_id: sampleLocation.id })
      });
      const passed = res.status === 400 && !res.data?.success;
      recordTest('Orders', 'POST /api/orders/create (Reject Empty Cart)', passed, res.duration, res.data?.message);
    }

    // 4.2 Excessive Quantity Rejection (>50)
    {
      const res = await request('/api/orders/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          items: [{ id: sampleItem.id, quantity: 999 }],
          location_id: sampleLocation.id
        })
      });
      const passed = res.status === 400 && !res.data?.success;
      recordTest('Orders', 'POST /api/orders/create (Reject Excessive Quantity > 50)', passed, res.duration, res.data?.message);
    }

    // 4.3 Client Price Tampering Immunity
    // Client sends customer_price = 0.01, server MUST recalculate using real DB price
    {
      const res = await request('/api/orders/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          items: [{ id: sampleItem.id, quantity: 1, customer_price: 0.01 }], // Tampered price
          location_id: sampleLocation.id,
          payment_source: 'cod_outlet'
        })
      });
      const expectedItemPrice = parseFloat(sampleItem.customer_price);
      const orderTotal = parseFloat(res.data?.order?.total_customer_price || 0);
      const passed = res.status === 200 && res.data?.success && orderTotal >= expectedItemPrice;
      recordTest('Orders', 'POST /api/orders/create (Price Tampering Immunity Check)', passed, res.duration, `DB Price: ₹${expectedItemPrice}, Charged: ₹${orderTotal}`);
    }

    // 4.4 Successful Delivery Order Creation with Token Generation
    {
      const res = await request('/api/orders/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          items: [{ id: sampleItem.id, quantity: 1 }],
          location_id: sampleLocation.id,
          payment_source: 'cod_outlet',
          delivery_address_note: 'Hostel Room 204'
        })
      });
      const passed = res.status === 200 && res.data?.success && res.data?.order?.order_token?.startsWith('#2R-');
      recordTest('Orders', 'POST /api/orders/create (Valid COD Order + Entropy Token)', passed, res.duration, `Token: ${res.data?.order?.order_token}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Wallet & Concurrency Race Condition Parameters
  // ─────────────────────────────────────────────────────────────────────────────
  if (adminToken && customerUser && sampleItem && sampleLocation) {
    // 5.1 Admin Adjust Wallet Balance (+₹100)
    {
      const res = await request(`/api/admin/customers/${customerUser.id}/wallet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ amount: 100, description: 'Automated Test Credit' })
      });
      const passed = res.status === 200 && res.data?.success && res.data?.newBalance >= 100;
      recordTest('Wallet', 'POST /api/admin/customers/:id/wallet (Credit Balance ₹100)', passed, res.duration, `New Balance: ₹${res.data?.newBalance}`);
    }

    // 5.2 Wallet Order with Insufficient Balance (< Grand Total)
    {
      const res = await request('/api/orders/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${customerToken}` },
        body: JSON.stringify({
          items: [{ id: sampleItem.id, quantity: 15 }], // 15 items will cost > ₹100
          location_id: sampleLocation.id,
          payment_source: 'wallet'
        })
      });
      const passed = res.status === 400 && !res.data?.success;
      recordTest('Wallet', 'POST /api/orders/create (Reject Wallet Payment When Insufficient)', passed, res.duration, res.data?.message);
    }

    // 5.3 Concurrency Double-Spend Race Condition Attack
    // User has ₹100 in wallet. Two simultaneous orders each costing ~₹70-₹85 fire at the same ms.
    // Row lock (FOR UPDATE) MUST permit exactly 1 order, and reject the second!
    {
      console.log('⚡ Launching simultaneous Double-Spend attack test...');
      const orderPayload = JSON.stringify({
        items: [{ id: sampleItem.id, quantity: 1 }],
        location_id: sampleLocation.id,
        payment_source: 'wallet'
      });

      const [res1, res2] = await Promise.all([
        request('/api/orders/create', { method: 'POST', headers: { Authorization: `Bearer ${customerToken}` }, body: orderPayload }),
        request('/api/orders/create', { method: 'POST', headers: { Authorization: `Bearer ${customerToken}` }, body: orderPayload })
      ]);

      const successCount = (res1.status === 200 ? 1 : 0) + (res2.status === 200 ? 1 : 0);
      const failCount = (res1.status === 400 ? 1 : 0) + (res2.status === 400 ? 1 : 0);
      const passed = successCount === 1 && failCount === 1;

      recordTest(
        'Concurrency',
        'POST /api/orders/create (Row Lock .forUpdate() Double-Spend Prevention)',
        passed,
        Math.max(res1.duration, res2.duration),
        `Successes: ${successCount}, Prevented: ${failCount} (Zero Double-Spend)`
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Admin & Vendor Analytics Protected Endpoints
  // ─────────────────────────────────────────────────────────────────────────────
  if (adminToken) {
    const res = await request('/api/admin/dashboard-stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const passed = res.status === 200 && res.data?.success && res.data?.stats !== undefined;
    recordTest('Analytics', 'GET /api/admin/dashboard-stats (Super Admin Parallel Aggregates)', passed, res.duration, `Total Orders: ${res.data?.stats?.total_orders}`);
  }

  if (vendorToken) {
    const res = await request('/api/vendor/summary', {
      headers: { Authorization: `Bearer ${vendorToken}` }
    });
    const passed = res.status === 200 && res.data?.success && res.data?.summary !== undefined;
    recordTest('Analytics', 'GET /api/vendor/summary (Vendor O(N) Financial Accumulator)', passed, res.duration, `Pending Payable: ₹${res.data?.summary?.pending_payable}`);
  }

  // Role Enforcement: Customer trying to access Admin Dashboard (Must return 403)
  if (customerToken) {
    const res = await request('/api/admin/dashboard-stats', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const passed = res.status === 403 && !res.data?.success;
    recordTest('RBAC', 'GET /api/admin/dashboard-stats (Reject Unauthorized Customer)', passed, res.duration, res.data?.message);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Summary & Benchmark Report
  // ─────────────────────────────────────────────────────────────────────────────
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const avgLatency = (results.reduce((acc, r) => acc + r.durationMs, 0) / totalTests).toFixed(1);

  console.log('\n===============================================================');
  console.log(`  TEST RESULTS: ${passedTests}/${totalTests} PASSED (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`  Failed Tests : ${failedTests}`);
  console.log(`  Average Latency: ${avgLatency}ms`);
  console.log('===============================================================\n');

  if (failedTests > 0) {
    console.error('❌ Some tests failed. Review log above.');
    process.exit(1);
  } else {
    console.log('🎉 ALL API ENDPOINTS PASSED WITH 100% ACCURACY AND SECURITY!');
  }
}

runTests().catch(err => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
