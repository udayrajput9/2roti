const { WebSocketServer } = require('ws');

let wss = null;
const clients = new Map(); // ws -> { role, staffId, outletLocationId }

function initWebSocket(server) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Basic ping/pong heartbeat
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'IDENTIFY') {
          // Store connection context
          clients.set(ws, {
            role: data.role || 'GUEST',
            staffId: data.staffId || null,
            outletLocationId: data.outletLocationId || null
          });
        }
      } catch (e) {
        // Ignore malformed ping/text
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  const interval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  console.log('📡 WebSocket Server initialized on /ws');
}

function broadcastOrderEvent(eventType, orderData) {
  if (!wss) return;

  const payload = JSON.stringify({
    type: eventType, // e.g. 'NEW_ORDER', 'ORDER_STATUS_CHANGED', 'ORDER_CANCELLED'
    data: orderData,
    timestamp: new Date().toISOString()
  });

  clients.forEach((clientInfo, ws) => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      // Routing logic:
      // Super Admin & Order Manager get ALL events
      if (clientInfo.role === 'SUPER_ADMIN' || clientInfo.role === 'ORDER_MANAGER') {
        ws.send(payload);
      } 
      // Vendor gets events ONLY for their outlet
      else if (clientInfo.role === 'VENDOR') {
        if (orderData.is_outlet_order) {
          // If vendor is bound to this location or general outlet
          if (!clientInfo.outletLocationId || clientInfo.outletLocationId === orderData.location_id) {
            const vendorOrder = { ...orderData };
            delete vendorOrder.total_customer_price;
            delete vendorOrder.platform_margin;
            if (Array.isArray(vendorOrder.items)) {
              vendorOrder.items = vendorOrder.items.map(it => {
                const sanitized = { ...it };
                delete sanitized.customer_price;
                return sanitized;
              });
            }
            ws.send(JSON.stringify({
              type: eventType,
              data: vendorOrder,
              timestamp: new Date().toISOString()
            }));
          }
        }
      } 
      // Customers/all
      else {
        ws.send(payload);
      }
    }
  });
}

module.exports = {
  initWebSocket,
  broadcastOrderEvent
};
