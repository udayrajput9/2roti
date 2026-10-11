const db = require('../config/database');
const { broadcastOrderEvent } = require('../services/socketService');

let tableChecked = false;
async function ensureTableAndPurge() {
  try {
    if (!tableChecked) {
      const hasTable = await db.schema.hasTable('order_chats');
      if (!hasTable) {
        await db.schema.createTable('order_chats', (table) => {
          table.increments('id').primary();
          table.integer('order_id').references('id').inTable('orders').onDelete('CASCADE');
          table.string('order_token').notNullable();
          table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
          table.string('sender_type').notNullable(); // CUSTOMER or ADMIN
          table.string('sender_name').notNullable();
          table.text('message').notNullable();
          table.timestamp('created_at').defaultTo(db.fn.now());
        });
        await db.raw('CREATE INDEX IF NOT EXISTS idx_order_chats_order_id ON order_chats(order_id)');
        await db.raw('CREATE INDEX IF NOT EXISTS idx_order_chats_user_id ON order_chats(user_id)');
        await db.raw('CREATE INDEX IF NOT EXISTS idx_order_chats_created_at ON order_chats(created_at)');
      }
      tableChecked = true;
    }

    // Purge messages older than 4 days (rolling 4-day retention limit)
    await db('order_chats')
      .where('created_at', '<', db.raw("NOW() - INTERVAL '4 days'"))
      .del();
  } catch (e) {
    // Non-blocking fallback
  }
}

// 1. Customer: Get customer's orders eligible for chat (placed in last 4 days or currently active)
async function getCustomerChatOrders(req, res) {
  try {
    await ensureTableAndPurge();
    const userId = req.user.id;

    const orders = await db('orders')
      .where({ user_id: userId })
      .where(function() {
        this.whereIn('order_status', ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'])
          .orWhere('created_at', '>=', db.raw("NOW() - INTERVAL '4 days'"));
      })
      .orderBy('created_at', 'desc')
      .limit(20);

    const orderIds = orders.map(o => o.id);
    const items = await db('order_items').whereIn('order_id', orderIds);
    const itemsMap = new Map();
    items.forEach(it => {
      if (!itemsMap.has(it.order_id)) itemsMap.set(it.order_id, []);
      itemsMap.get(it.order_id).push(it);
    });

    const enrichedOrders = orders.map(o => ({
      ...o,
      items: itemsMap.get(o.id) || []
    }));

    return res.json({
      success: true,
      orders: enrichedOrders
    });
  } catch (err) {
    console.error('getCustomerChatOrders error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch chat orders.' });
  }
}

// 2. Customer: Get messages for a specific order
async function getOrderMessages(req, res) {
  try {
    await ensureTableAndPurge();
    const userId = req.user.id;
    const { orderId } = req.params;

    const order = await db('orders')
      .where({ id: orderId, user_id: userId })
      .first();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or does not belong to you.' });
    }

    const items = await db('order_items').where({ order_id: order.id });
    order.items = items;

    const messages = await db('order_chats')
      .where({ order_id: orderId })
      .where('created_at', '>=', db.raw("NOW() - INTERVAL '4 days'"))
      .orderBy('created_at', 'asc');

    return res.json({
      success: true,
      order: {
        id: order.id,
        order_token: order.order_token,
        customer_name: order.customer_name,
        delivery_otp: order.delivery_otp,
        order_status: order.order_status,
        total_customer_price: order.total_customer_price,
        delivery_fee: order.delivery_fee,
        location_name: order.location_name,
        assigned_runner_name: order.assigned_runner_name,
        assigned_runner_phone: order.assigned_runner_phone,
        created_at: order.created_at,
        items: items
      },
      messages
    });
  } catch (err) {
    console.error('getOrderMessages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
  }
}

// 3. Customer: Send message regarding their order
async function sendCustomerMessage(req, res) {
  try {
    await ensureTableAndPurge();
    const userId = req.user.id;
    const { orderId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
    }

    const cleanMsg = message.trim().substring(0, 1000);

    const order = await db('orders')
      .where({ id: orderId, user_id: userId })
      .first();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or access denied.' });
    }

    const [inserted] = await db('order_chats')
      .insert({
        order_id: order.id,
        order_token: order.order_token,
        user_id: userId,
        sender_type: 'CUSTOMER',
        sender_name: req.user.name || 'Campus Student',
        message: cleanMsg
      })
      .returning('*');

    const msgObj = inserted || {
      order_id: order.id,
      order_token: order.order_token,
      user_id: userId,
      sender_type: 'CUSTOMER',
      sender_name: req.user.name || 'Campus Student',
      message: cleanMsg,
      created_at: new Date().toISOString()
    };

    try {
      broadcastOrderEvent('support_chat_message', {
        orderId: order.id,
        orderToken: order.order_token,
        message: msgObj
      });
    } catch (e) {}

    return res.json({
      success: true,
      message: msgObj
    });
  } catch (err) {
    console.error('sendCustomerMessage error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
}

// 4. Admin: Get all chat threads (orders with messages in last 4 days)
async function getAdminChatThreads(req, res) {
  try {
    await ensureTableAndPurge();

    // Fetch distinct orders with messages from last 4 days
    const recentMessages = await db('order_chats')
      .where('created_at', '>=', db.raw("NOW() - INTERVAL '4 days'"))
      .orderBy('created_at', 'desc');

    const orderMap = new Map();
    for (const msg of recentMessages) {
      if (!orderMap.has(msg.order_id)) {
        orderMap.set(msg.order_id, msg);
      }
    }

    const orderIds = Array.from(orderMap.keys());
    if (orderIds.length === 0) {
      return res.json({ success: true, threads: [] });
    }

    const orders = await db('orders')
      .whereIn('id', orderIds)
      .select('id', 'order_token', 'customer_name', 'customer_phone', 'location_name', 'order_status', 'total_customer_price', 'created_at');

    const threads = orders.map(ord => {
      const lastMsg = orderMap.get(ord.id);
      return {
        ...ord,
        last_message: lastMsg ? lastMsg.message : '',
        last_message_sender: lastMsg ? lastMsg.sender_type : '',
        last_message_at: lastMsg ? lastMsg.created_at : ord.created_at
      };
    });

    threads.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

    return res.json({
      success: true,
      threads
    });
  } catch (err) {
    console.error('getAdminChatThreads error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch chat threads.' });
  }
}

// 5. Admin: Get all messages and order info for a thread
async function getAdminOrderMessages(req, res) {
  try {
    await ensureTableAndPurge();
    const { orderId } = req.params;

    const order = await db('orders')
      .where({ id: orderId })
      .first();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const items = await db('order_items').where({ order_id: order.id });
    order.items = items;

    const messages = await db('order_chats')
      .where({ order_id: orderId })
      .where('created_at', '>=', db.raw("NOW() - INTERVAL '4 days'"))
      .orderBy('created_at', 'asc');

    return res.json({
      success: true,
      order,
      messages
    });
  } catch (err) {
    console.error('getAdminOrderMessages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load order messages.' });
  }
}

// 6. Admin: Send reply to customer
async function sendAdminMessage(req, res) {
  try {
    await ensureTableAndPurge();
    const { orderId } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
    }

    const cleanMsg = message.trim().substring(0, 1000);

    const order = await db('orders').where({ id: orderId }).first();
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const staffName = req.staff?.name || '2Roti Support';

    const [inserted] = await db('order_chats')
      .insert({
        order_id: order.id,
        order_token: order.order_token,
        user_id: order.user_id,
        sender_type: 'ADMIN',
        sender_name: staffName,
        message: cleanMsg
      })
      .returning('*');

    const msgObj = inserted || {
      order_id: order.id,
      order_token: order.order_token,
      user_id: order.user_id,
      sender_type: 'ADMIN',
      sender_name: staffName,
      message: cleanMsg,
      created_at: new Date().toISOString()
    };

    try {
      broadcastOrderEvent('support_chat_message', {
        orderId: order.id,
        orderToken: order.order_token,
        message: msgObj
      });
    } catch (e) {}

    return res.json({
      success: true,
      message: msgObj
    });
  } catch (err) {
    console.error('sendAdminMessage error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send admin message.' });
  }
}

module.exports = {
  getCustomerChatOrders,
  getOrderMessages,
  sendCustomerMessage,
  getAdminChatThreads,
  getAdminOrderMessages,
  sendAdminMessage
};
