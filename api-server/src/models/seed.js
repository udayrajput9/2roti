const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { initSchema } = require('./schema');

async function seed() {
  await initSchema();

  // 1. Seed Locations
  const locations = [
    { name: 'Jhungiya' },
    { name: 'Buddha' },
    { name: 'KIPM' },
    { name: 'ITM' }
  ];

  for (const loc of locations) {
    const existing = await db('locations').where({ name: loc.name }).first();
    if (!existing) {
      await db('locations').insert(loc);
    }
  }
  console.log('📍 Locations seeded.');

  const jhungiyaLoc = await db('locations').where({ name: 'Jhungiya' }).first();

  // 2. Seed Staff Users
  const passwordHash = await bcrypt.hash('Admin@2Roti2026', 10);
  const managerHash = await bcrypt.hash('Manager@2Roti2026', 10);
  const vendorHash = await bcrypt.hash('Vendor@2Roti2026', 10);

  const staff = [
    {
      name: 'Super Admin',
      email: 'admin@2roti.com',
      phone: '9876543210',
      password_hash: passwordHash,
      role: 'SUPER_ADMIN',
      outlet_location_id: null,
      is_active: true
    },
    {
      name: 'Campus Order Manager',
      email: 'manager@2roti.com',
      phone: '9876543211',
      password_hash: managerHash,
      role: 'ORDER_MANAGER',
      outlet_location_id: null,
      is_active: true
    },
    {
      name: 'Jhungiya Outlet Vendor',
      email: 'vendor.jhungiya@2roti.com',
      phone: '9876543212',
      password_hash: vendorHash,
      role: 'VENDOR',
      outlet_location_id: jhungiyaLoc ? jhungiyaLoc.id : null,
      is_active: true
    }
  ];

  for (const s of staff) {
    const existing = await db('staff_users').where({ email: s.email }).first();
    if (!existing) {
      await db('staff_users').insert(s);
    }
  }
  console.log('👥 Staff Users seeded.');

  // 3. Seed Regular Menu Items
  const regularItems = [
    // Curry
    { name: 'Chicken Curry', category: 'Curry', is_outlet_only: false, customer_price: 120, vendor_cost: 100, is_veg: false, description: 'Homestyle rich gravy chicken with desi spices' },
    { name: 'Vegetable Curry', category: 'Curry', is_outlet_only: false, customer_price: 70, vendor_cost: 55, is_veg: true, description: 'Fresh seasonal vegetables cooked in aromatic spiced curry' },
    { name: 'Paneer Curry', category: 'Curry', is_outlet_only: false, customer_price: 90, vendor_cost: 75, is_veg: true, description: 'Cottage cheese cubes simmered in thick tomato-onion gravy' },
    { name: 'Mutton Curry', category: 'Curry', is_outlet_only: false, customer_price: 160, vendor_cost: 140, is_veg: false, description: 'Slow-cooked tender mutton in royal Awadhi style gravy' },

    // Thali
    { name: 'Chicken Thali', category: 'Thali', is_outlet_only: false, customer_price: 120, vendor_cost: 100, is_veg: false, description: 'Chicken Curry, 4 Tawa Roti, Rice, Dal & Salad' },
    { name: 'Veg Thali', category: 'Thali', is_outlet_only: false, customer_price: 70, vendor_cost: 55, is_veg: true, description: 'Seasonal Sabji, Dal Fry, 4 Roti, Jeera Rice & Salad' },
    { name: 'Paneer Thali', category: 'Thali', is_outlet_only: false, customer_price: 100, vendor_cost: 85, is_veg: true, description: 'Special Paneer, Dal Makhani, 4 Butter Roti, Rice & Salad' },
    { name: 'Mutton Thali', category: 'Thali', is_outlet_only: false, customer_price: 170, vendor_cost: 145, is_veg: false, description: 'Mutton Curry, 4 Roti, Steamed Rice, Raita & Salad' },

    // Biryani
    { name: 'Veg Biryani', category: 'Biryani', is_outlet_only: false, customer_price: 40, vendor_cost: 35, is_veg: true, description: 'Fragrant basmati rice layered with spiced vegetables & mint' },
    { name: 'Chicken Biryani', category: 'Biryani', is_outlet_only: false, customer_price: 70, vendor_cost: 60, is_veg: false, description: 'Authentic Dum Biryani with juicy chicken pieces & raita' },
    { name: 'Egg Biryani', category: 'Biryani', is_outlet_only: false, customer_price: 60, vendor_cost: 50, is_veg: false, description: 'Spiced basmati rice served with roasted masala eggs' },

    // Pizza
    { name: 'Paneer Pizza', category: 'Pizza', is_outlet_only: false, customer_price: 120, vendor_cost: 100, is_veg: true, description: 'Crisp crust loaded with tandoori paneer, mozzarella & capsicum' },
    { name: 'Onion Pizza', category: 'Pizza', is_outlet_only: false, customer_price: 70, vendor_cost: 55, is_veg: true, description: 'Cheesy classic pizza topped with caramelized onions & herbs' }
  ];

  for (const item of regularItems) {
    const existing = await db('menu_items').where({ name: item.name }).first();
    if (!existing) {
      await db('menu_items').insert(item);
    }
  }
  console.log('🍛 Regular menu seeded.');

  // 4. Seed Outlet CSV Items (Provided in Prompt)
  const outletCsvItems = [
    { name: 'Mattar Panner', category: 'Outlet Special', is_outlet_only: true, customer_price: 80, vendor_cost: 70, is_veg: true, description: 'Green peas & fresh paneer in rich tomato-based gravy' },
    { name: 'Chawal+roti(pack)', category: 'Outlet Special', is_outlet_only: true, customer_price: 30, vendor_cost: 25, is_veg: true, description: 'Quick campus combo pack: 4 rotis + steamed rice' },
    { name: 'Tandoori roti', category: 'Breads', is_outlet_only: true, customer_price: 8, vendor_cost: 7, is_veg: true, description: 'Clay-oven baked crisp whole wheat tandoori roti' },
    { name: 'Egg kari', category: 'Curry', is_outlet_only: true, customer_price: 60, vendor_cost: 50, is_veg: false, description: '2 Boiled eggs shallow-fried in spiced onion-tomato curry' },
    { name: 'chicken kari', category: 'Curry', is_outlet_only: true, customer_price: 80, vendor_cost: 70, is_veg: false, description: 'Outlet special freshly prepared homestyle chicken curry' },
    { name: 'mutton kari', category: 'Curry', is_outlet_only: true, customer_price: 140, vendor_cost: 130, is_veg: false, description: 'Tender mutton cooked in traditional desi handi' },
    { name: 'Aalu Paratha', category: 'Breads', is_outlet_only: true, customer_price: 40, vendor_cost: 30, is_veg: true, description: 'Stuffed spiced potato paratha served with butter & pickle' },
    { name: 'Lacchha Paratha', category: 'Breads', is_outlet_only: true, customer_price: 25, vendor_cost: 20, is_veg: true, description: 'Multi-layered flaky crispy tandoor paratha' },
    { name: 'Chola Bhatura(Full)', category: 'Outlet Special', is_outlet_only: true, customer_price: 40, vendor_cost: 35, is_veg: true, description: '2 Fluffy hot bhaturas with spicy Amritsari chole & onions' },
    { name: 'Puri sabji', category: 'Outlet Special', is_outlet_only: true, customer_price: 30, vendor_cost: 25, is_veg: true, description: '4 Golden hot puris served with spicy aloo dum' },
    { name: 'Sadi Sabji', category: 'Outlet Special', is_outlet_only: true, customer_price: 30, vendor_cost: 25, is_veg: true, description: 'Simple daily home-style dry vegetable preparation' },
    { name: 'sada Thali', category: 'Thali', is_outlet_only: true, customer_price: 70, vendor_cost: 60, is_veg: true, description: 'Affordable daily campus thali: Sabji, Dal, 4 Roti, Rice' },
    { name: 'Chicken thali (Outlet)', category: 'Thali', is_outlet_only: true, customer_price: 120, vendor_cost: 110, is_veg: false, description: 'Outlet chicken special thali with hot rotis & rice' },
    { name: 'Fried Rice', category: 'Rice', is_outlet_only: true, customer_price: 40, vendor_cost: 35, is_veg: true, description: 'Wok-tossed basmati rice with spring onions & vegetables' },
    { name: 'Chicken Rice', category: 'Rice', is_outlet_only: true, customer_price: 70, vendor_cost: 60, is_veg: false, description: 'Fried rice with tender shredded chicken & oriental sauce' },
    { name: 'Paneer Rice', category: 'Rice', is_outlet_only: true, customer_price: 60, vendor_cost: 50, is_veg: true, description: 'Flavorful spiced rice with diced paneer & peas' },
    { name: 'Egg Roll', category: 'Rolls', is_outlet_only: true, customer_price: 40, vendor_cost: 30, is_veg: false, description: 'Crisp paratha wrap with double egg, crunchy onions & chutneys' },
    { name: 'Chicken Roll', category: 'Rolls', is_outlet_only: true, customer_price: 60, vendor_cost: 50, is_veg: false, description: 'Juicy spiced chicken kebab rolled inside flaky paratha' },
    { name: 'Paneer Roll', category: 'Rolls', is_outlet_only: true, customer_price: 50, vendor_cost: 45, is_veg: true, description: 'Marinated paneer tikka rolled with mint sauce & spices' },
    { name: 'Veg Roll', category: 'Rolls', is_outlet_only: true, customer_price: 40, vendor_cost: 30, is_veg: true, description: 'Crispy vegetable cutlet rolled in toasted paratha' },
    { name: 'Veg Biryani (Outlet)', category: 'Biryani', is_outlet_only: true, customer_price: 40, vendor_cost: 35, is_veg: true, description: 'Outlet freshly dum cooked spiced veg biryani' },
    { name: 'Chicken Biryani (Outlet)', category: 'Biryani', is_outlet_only: true, customer_price: 70, vendor_cost: 65, is_veg: false, description: 'Hot spicy chicken dum biryani portion for quick dining' },
    { name: 'Egg Biryani (Outlet)', category: 'Biryani', is_outlet_only: true, customer_price: 60, vendor_cost: 55, is_veg: false, description: 'Fragrant outlet biryani rice with 2 roasted eggs' },
    { name: 'Paneer Pizza (Outlet)', category: 'Pizza', is_outlet_only: true, customer_price: 120, vendor_cost: 110, is_veg: true, description: 'Fresh pan pizza baked with paneer cubes & melted cheese' },
    { name: 'Onion Pizza (Outlet)', category: 'Pizza', is_outlet_only: true, customer_price: 70, vendor_cost: 60, is_veg: true, description: 'Crispy stone-baked base topped with onions & herbs' }
  ];

  for (const item of outletCsvItems) {
    const existing = await db('menu_items').where({ name: item.name }).first();
    if (!existing) {
      await db('menu_items').insert(item);
    }
  }
  console.log('🏪 Outlet CSV items seeded successfully.');

  // 5. Seed System Settings
  const settings = [
    { key: 'CASHBACK_AMOUNT', value: '3.00' },
    { key: 'MIN_WALLET_REDEMPTION', value: '50.00' },
    { key: 'FREE_DELIVERY_THRESHOLD', value: '100.00' },
    { key: 'DEFAULT_DELIVERY_FEE', value: '15.00' },
    { key: 'STORE_STATUS', value: 'OPEN' }
  ];

  for (const set of settings) {
    const existing = await db('system_settings').where({ key: set.key }).first();
    if (!existing) {
      await db('system_settings').insert(set);
    }
  }
  console.log('⚙️ System Settings seeded.');
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log('✨ Database seeding complete!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seeding error:', err);
      process.exit(1);
    });
}

module.exports = { seed };
