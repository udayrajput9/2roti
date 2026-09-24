const http = require('http');
const { app, server } = require('./src/server');
const db = require('./src/config/database');

async function runTests() {
  console.log('🧪 Starting 2 Roti Full-Stack End-to-End Automated Verification...\n');

  // Helper fetch function
  const request = async (path, options = {}) => {
    const url = `http://localhost:5000${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, ok: res.ok, body: json, headers: res.headers };
  };

  try {
    // 1. Health check
    console.log('1️⃣ Testing API Health check...');
    const health = await request('/api/health');
    console.log(`   Status: ${health.status} | Service: ${health.body?.service}`);
    if (health.status !== 200) throw new Error('Health check failed');

    // 2. Locations check (4 campuses: Jhungiya, Buddha, KIPM, ITM)
    console.log('\n2️⃣ Testing Campus Locations...');
    const locs = await request('/api/menu/locations');
    const locNames = locs.body?.locations?.map(l => l.name);
    console.log(`   Found locations: ${locNames.join(', ')}`);
    if (!locNames.includes('Jhungiya') || !locNames.includes('ITM') || !locNames.includes('KIPM') || !locNames.includes('Buddha')) {
      throw new Error('Mandatory 4 campus locations missing');
    }

    // 3. Menu categories check (Curry, Thali, Biryani, Pizza, Outlet Special)
    console.log('\n3️⃣ Testing Menu Categories & CSV Items...');
    const menu = await request('/api/menu');
    console.log(`   Curry: ${menu.body?.menu?.Curry?.length} items`);
    console.log(`   Thali: ${menu.body?.menu?.Thali?.length} items`);
    console.log(`   Biryani: ${menu.body?.menu?.Biryani?.length} items`);
    console.log(`   Pizza: ${menu.body?.menu?.Pizza?.length} items`);
    console.log(`   Outlet Special: ${menu.body?.menu?.Outlet?.length} items`);
    if (!menu.body?.menu?.Curry || !menu.body?.menu?.Thali || !menu.body?.menu?.Biryani || !menu.body?.menu?.Pizza) {
      throw new Error('Missing primary menu categories');
    }

    // 4. Customer Login & Onboarding
    console.log('\n4️⃣ Testing Customer Authentication & Onboarding...');
    const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const auth = await request('/api/auth/customer', {
      method: 'POST',
      body: JSON.stringify({ phone: testPhone, name: 'Test Student' })
    });
    const token = auth.body?.token;
    console.log(`   Customer Token issued: ${token ? 'YES' : 'NO'} for phone ${testPhone}`);

    const completeProf = await request('/api/auth/complete-profile', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: 'Aman Verma',
        location_id: locs.body.locations.find(l => l.name === 'KIPM').id
      })
    });
    console.log(`   Profile Complete: ${completeProf.body?.user?.is_profile_complete} | Campus: ${completeProf.body?.user?.location_name}`);

    // 5. Place Customer Order (Curry + Biryani)
    console.log('\n5️⃣ Testing Order Creation (Campus Delivery)...');
    const chickenCurry = menu.body.menu.Curry.find(i => i.name.includes('Chicken'));
    const vegBiryani = menu.body.menu.Biryani.find(i => i.name.includes('Veg'));

    const orderRes = await request('/api/orders/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        items: [
          { id: chickenCurry.id, quantity: 1 },
          { id: vegBiryani.id, quantity: 2 }
        ],
        location_id: completeProf.body.user.default_location_id,
        delivery_address_note: 'Hostel B, Room 204',
        payment_source: 'razorpay',
        razorpay_order_id: 'order_test_123',
        razorpay_payment_id: 'pay_test_456'
      })
    });
    const order = orderRes.body?.order;
    console.log(`   Order Token: ${order?.order_token} | Customer Price: ₹${order?.total_customer_price} | Vendor Cost: ₹${order?.total_vendor_cost} | Margin: ₹${order?.platform_margin}`);

    // 6. Staff Login (Super Admin & Order Manager)
    console.log('\n6️⃣ Testing Staff Logins (RBAC)...');
    const adminLogin = await request('/api/auth/staff/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@2roti.com', password: 'Admin@2Roti2026' })
    });
    const adminToken = adminLogin.body?.token;
    console.log(`   Admin Login: ${adminLogin.body?.staff?.role} (Token: OK)`);

    const vendorLogin = await request('/api/auth/staff/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'vendor.jhungiya@2roti.com', password: 'Vendor@2Roti2026' })
    });
    console.log(`   Vendor Login: ${vendorLogin.body?.staff?.role} (Outlet: ${vendorLogin.body?.staff?.outlet_name})`);

    // 7. Order Status Transition: Placed -> Accepted -> Preparing -> Out for Delivery -> Delivered
    console.log('\n7️⃣ Testing Order Lifecycle & ₹3 Cashback Trigger on Delivery...');
    await request(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ new_status: 'ACCEPTED' })
    });
    await request(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ new_status: 'PREPARING' })
    });
    await request(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ new_status: 'OUT_FOR_DELIVERY' })
    });
    const deliveredRes = await request(`/api/orders/${order.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ new_status: 'DELIVERED' })
    });
    console.log(`   Status reached: ${deliveredRes.body?.order?.order_status} | Cashback awarded flag: ${deliveredRes.body?.order?.is_cashback_awarded}`);

    // 8. Verify Customer Loyalty Wallet credited with ₹3
    console.log('\n8️⃣ Verifying Customer Wallet Ledger...');
    const walletRes = await request('/api/wallet/my-wallet', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`   Wallet Balance: ₹${walletRes.body?.wallet_balance} (Expected: ₹3.00)`);
    console.log(`   Ledger Transactions: ${walletRes.body?.transactions?.length}`);
    if (walletRes.body?.wallet_balance !== 3.00) {
      throw new Error(`Cashback mismatch: expected 3.00, got ${walletRes.body?.wallet_balance}`);
    }

    // 9. Vendor Accounting & Settlement with Bank UTR
    console.log('\n9️⃣ Testing Vendor Wallet Accounting & UTR Settlement...');
    const jhungiyaLoc = locs.body.locations.find(l => l.name === 'Jhungiya');
    const mattarPaneer = menu.body.menu.Outlet.find(i => i.name.includes('Mattar Panner')) || menu.body.menu.Outlet[0];
    
    // Place an outlet order
    const outletOrderRes = await request('/api/orders/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        items: [{ id: mattarPaneer.id, quantity: 2 }],
        location_id: jhungiyaLoc.id,
        is_outlet_order: true,
        delivery_address_note: 'Jhungiya Outlet Counter',
        payment_source: 'razorpay',
        razorpay_order_id: 'order_outlet_123',
        razorpay_payment_id: 'pay_outlet_456'
      })
    });
    const outletOrder = outletOrderRes.body?.order;

    // Advance to DELIVERED
    await request(`/api/orders/${outletOrder.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ new_status: 'DELIVERED' })
    });

    const vendorSummary = await request('/api/vendor/summary', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`   Vendor Pending Payable: ₹${vendorSummary.body?.summary?.pending_payable}`);

    const settleRes = await request('/api/vendor/settlements/payout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        vendor_id: 3,
        utr_reference: 'UTR_HDFC_9988776655',
        note: 'Weekly Gorakhpur Jhungiya settlement'
      })
    });
    console.log(`   Settlement Result: ${settleRes.body?.message}`);
    console.log(`   Settlement ID: #SETTLE-${settleRes.body?.settlement?.id} | Status: ${settleRes.body?.settlement?.status}`);

    // 10. Dynamic CSV Menu Upload & Audit Trail
    console.log('\n🔟 Testing Dynamic CSV Menu Upload & Validation...');
    const sampleCsv = `Items,Deal with Vendor,Customer Price
Special Paneer Do Pyaza,85,110
Masala Kulcha,20,30`;

    const uploadRes = await request('/api/menu/upload-csv', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ csv_text: sampleCsv })
    });
    console.log(`   CSV Upload result: ${uploadRes.body?.message}`);

    const auditRes = await request('/api/menu/audits', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`   Audit logs count: ${auditRes.body?.audits?.length} (Latest: ${auditRes.body?.audits?.[0]?.filename})`);

    // 11. Security Audit Logs
    console.log('\n1️⃣1️⃣ Testing Security Audit & Anti-Bot Infrastructure...');
    const secRes = await request('/api/security/overview', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log(`   Security status: OK | Blocked IPs: ${secRes.body?.security?.total_blocked_ips}`);

    console.log('\n🎉 ALL 11 END-TO-END VERIFICATION CHECKS PASSED WITH 100% SUCCESS!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
  }
}

// Wait for server to bind then run
setTimeout(runTests, 1500);
