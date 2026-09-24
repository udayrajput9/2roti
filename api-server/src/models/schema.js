const db = require('../config/database');

async function initSchema() {
  // 1. locations
  if (!await db.schema.hasTable('locations')) {
    await db.schema.createTable('locations', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 2. users (customers)
  if (!await db.schema.hasTable('users')) {
    await db.schema.createTable('users', (table) => {
      table.increments('id').primary();
      table.string('firebase_uid').nullable().unique();
      table.string('phone_number').nullable();
      table.string('name').nullable();
      table.string('email').nullable();
      table.string('password_hash').nullable();
      table.integer('default_location_id').references('id').inTable('locations');
      table.boolean('is_profile_complete').defaultTo(false);
      table.decimal('wallet_balance', 10, 2).defaultTo(0.00);
      table.string('status').defaultTo('ACTIVE'); // ACTIVE, BLOCKED
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // 3. staff_users (Super Admin, Order Manager, Vendor)
  if (!await db.schema.hasTable('staff_users')) {
    await db.schema.createTable('staff_users', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('email').notNullable().unique();
      table.string('phone').nullable();
      table.string('password_hash').notNullable();
      table.string('role').notNullable(); // SUPER_ADMIN, ORDER_MANAGER, VENDOR
      table.integer('outlet_location_id').references('id').inTable('locations').nullable();
      table.boolean('is_active').defaultTo(true);
      table.string('two_factor_secret').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 4. sessions (refresh token rotation & logout-all)
  if (!await db.schema.hasTable('sessions')) {
    await db.schema.createTable('sessions', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').nullable();
      table.integer('staff_id').references('id').inTable('staff_users').nullable();
      table.string('refresh_token_hash').notNullable();
      table.string('user_agent').nullable();
      table.string('ip_address').nullable();
      table.timestamp('expires_at').notNullable();
      table.timestamp('revoked_at').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 5. menu_items
  if (!await db.schema.hasTable('menu_items')) {
    await db.schema.createTable('menu_items', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
      table.string('category').notNullable(); // Curry, Thali, Biryani, Pizza, Outlet Special, Breads, Rice, Rolls
      table.boolean('is_outlet_only').defaultTo(false);
      table.decimal('customer_price', 10, 2).notNullable();
      table.decimal('vendor_cost', 10, 2).notNullable();
      table.boolean('is_veg').defaultTo(true);
      table.string('image_url').nullable();
      table.text('description').nullable();
      table.boolean('is_available').defaultTo(true);
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 6. menu_upload_audits (CSV/XLSX dynamic uploads)
  if (!await db.schema.hasTable('menu_upload_audits')) {
    await db.schema.createTable('menu_upload_audits', (table) => {
      table.increments('id').primary();
      table.integer('admin_id').references('id').inTable('staff_users').nullable();
      table.string('filename').notNullable();
      table.integer('items_added').defaultTo(0);
      table.integer('items_updated').defaultTo(0);
      table.text('snapshot_json').nullable();
      table.timestamp('uploaded_at').defaultTo(db.fn.now());
    });
  }

  // 7. orders
  if (!await db.schema.hasTable('orders')) {
    await db.schema.createTable('orders', (table) => {
      table.increments('id').primary();
      table.string('order_token').notNullable().unique(); // e.g. #2R-1001
      table.integer('user_id').references('id').inTable('users').notNullable();
      table.string('customer_name').notNullable();
      table.string('customer_phone').notNullable();
      table.integer('location_id').references('id').inTable('locations').notNullable();
      table.string('location_name').notNullable();
      table.string('delivery_address_note').nullable();
      table.boolean('is_outlet_order').defaultTo(false);
      table.decimal('total_customer_price', 10, 2).notNullable();
      table.decimal('total_vendor_cost', 10, 2).notNullable();
      table.decimal('platform_margin', 10, 2).notNullable();
      table.decimal('delivery_fee', 10, 2).defaultTo(0.00);
      table.string('payment_source').notNullable(); // razorpay, wallet, cod_outlet
      table.string('payment_status').defaultTo('PENDING'); // PENDING, PAID, FAILED, REFUNDED
      table.string('razorpay_order_id').nullable();
      table.string('razorpay_payment_id').nullable();
      table.string('order_status').defaultTo('PLACED'); // PLACED, ACCEPTED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, REFUNDED
      table.string('assigned_runner_name').nullable();
      table.string('assigned_runner_phone').nullable();
      table.integer('settlement_id').nullable(); // Linked when settled with vendor
      table.boolean('is_cashback_awarded').defaultTo(false);
      table.boolean('is_test_simulated').defaultTo(false);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  // 8. order_items
  if (!await db.schema.hasTable('order_items')) {
    await db.schema.createTable('order_items', (table) => {
      table.increments('id').primary();
      table.integer('order_id').references('id').inTable('orders').onDelete('CASCADE');
      table.integer('menu_item_id').references('id').inTable('menu_items');
      table.string('item_name').notNullable();
      table.integer('quantity').notNullable();
      table.decimal('customer_price', 10, 2).notNullable();
      table.decimal('vendor_cost', 10, 2).notNullable();
    });
  }

  // 9. wallet_transactions (Customer Loyalty Ledger)
  if (!await db.schema.hasTable('wallet_transactions')) {
    await db.schema.createTable('wallet_transactions', (table) => {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').notNullable();
      table.string('type').notNullable(); // cashback_credit, order_debit, order_refund_credit, cashback_reversal, admin_adjustment
      table.decimal('amount', 10, 2).notNullable();
      table.integer('related_order_id').nullable();
      table.decimal('balance_after', 10, 2).notNullable();
      table.string('note').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 10. vendor_settlements
  if (!await db.schema.hasTable('vendor_settlements')) {
    await db.schema.createTable('vendor_settlements', (table) => {
      table.increments('id').primary();
      table.integer('vendor_id').references('id').inTable('staff_users').notNullable();
      table.string('vendor_name').notNullable();
      table.string('period_start').notNullable();
      table.string('period_end').notNullable();
      table.integer('total_orders').notNullable();
      table.decimal('razorpay_funded_amount', 10, 2).defaultTo(0.00);
      table.decimal('wallet_funded_amount', 10, 2).defaultTo(0.00);
      table.decimal('adjustments', 10, 2).defaultTo(0.00);
      table.decimal('final_payable', 10, 2).notNullable();
      table.string('status').defaultTo('PENDING'); // PENDING, PAID
      table.string('utr_reference').nullable();
      table.string('marked_paid_by').nullable();
      table.timestamp('paid_at').nullable();
      table.string('payment_mode').defaultTo('BANK_TRANSFER').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  } else {
    if (!await db.schema.hasColumn('vendor_settlements', 'payment_mode')) {
      await db.schema.alterTable('vendor_settlements', (table) => {
        table.string('payment_mode').defaultTo('BANK_TRANSFER').nullable();
      });
    }
  }

  // 11. webhook_logs (Idempotency storage)
  if (!await db.schema.hasTable('webhook_logs')) {
    await db.schema.createTable('webhook_logs', (table) => {
      table.increments('id').primary();
      table.string('event_id').notNullable().unique();
      table.string('event_type').notNullable();
      table.text('payload').notNullable();
      table.boolean('is_idempotent_duplicate').defaultTo(false);
      table.timestamp('processed_at').defaultTo(db.fn.now());
    });
  }

  // 12. security_audit_logs
  if (!await db.schema.hasTable('security_audit_logs')) {
    await db.schema.createTable('security_audit_logs', (table) => {
      table.increments('id').primary();
      table.string('ip_address').notNullable();
      table.string('user_agent').nullable();
      table.string('endpoint').notNullable();
      table.string('action').notNullable();
      table.integer('threat_score').defaultTo(0);
      table.boolean('is_blocked').defaultTo(false);
      table.text('details').nullable();
      table.timestamp('created_at').defaultTo(db.fn.now());
    });
  }

  // 13. system_settings
  if (!await db.schema.hasTable('system_settings')) {
    await db.schema.createTable('system_settings', (table) => {
      table.string('key').primary();
      table.string('value').notNullable();
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  }

  console.log('✅ Database Schema initialized successfully.');
}

module.exports = { initSchema };
