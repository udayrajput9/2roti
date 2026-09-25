const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { initSchema } = require('./models/schema');
const { initWebSocket } = require('./services/socketService');
const { apiLimiter } = require('./middleware/antiBotMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const walletRoutes = require('./routes/walletRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const securityRoutes = require('./routes/securityRoutes');

const app = express();
const server = http.createServer(app);

// 1. Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 2. CORS configuration
const allowedOrigins = [
  'http://localhost:5173', // Customer Website
  'http://localhost:5174', // Admin ERP
  'http://localhost:3000',
  process.env.CLIENT_URL,
  process.env.ADMIN_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow during local development testing
    }
  },
  credentials: true
}));

// 3. Body & Cookie Parsing
app.use(cookieParser());
app.use(express.json({ limit: '100kb' })); // Mitigates JSON parse Event Loop blocking DoS
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// 4. Global Rate Limiting (Applied to all /api/* routes)
app.use('/api/', apiLimiter);

// 5. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/runner', require('./routes/runnerRoutes'));

// Public Settings Route
app.get('/api/settings', require('./controllers/statsController').getPublicSettings);

// Health Check
app.get('/api/health', async (req, res) => {
  const db = require('./config/database');
  const { firebaseInitialized } = require('./config/firebaseAdmin');
  
  let dbStatus = 'UNKNOWN';
  try {
    await db.raw('SELECT 1');
    dbStatus = 'CONNECTED';
  } catch (e) {
    dbStatus = 'ERROR: ' + e.message;
  }

  res.json({
    status: 'HEALTHY',
    service: '2 Roti API Server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    firebase_initialized: firebaseInitialized,
    firebase_service_account_set: !!process.env.FIREBASE_SERVICE_ACCOUNT,
    database_url_set: !!process.env.DATABASE_URL,
    db_status: dbStatus
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found.` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, message: 'Internal server error occurred.' });
});

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    await initSchema();
    initWebSocket(server);

    server.listen(PORT, () => {
      console.log(`🚀 2 Roti API Server running on port ${PORT}`);
      console.log(`📡 WebSocket endpoint available at ws://localhost:${PORT}/ws`);
    });
  } catch (err) {
    console.error('Fatal bootstrap error:', err);
    process.exit(1);
  }
}

if (require.main === module || !process.env.VERCEL) {
  bootstrap();
}

module.exports = { app, server };
