const { app } = require('../api-server/src/server');
const { initSchema } = require('../api-server/src/models/schema');

let isInitialized = false;
let initPromise = null;

function ensureInitialized() {
  if (isInitialized) return Promise.resolve();
  if (!initPromise) {
    initPromise = initSchema()
      .then(() => {
        isInitialized = true;
      })
      .catch((err) => {
        console.error('Serverless DB schema init error:', err);
        initPromise = null; // Allow retry on next request
      });
  }
  return initPromise;
}

module.exports = (req, res) => {
  // Ensure req.url matches Express routes mounted at /api/*
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }

  // Gracefully initialize schema before dispatching to Express
  ensureInitialized()
    .finally(() => {
      try {
        app(req, res);
      } catch (handlerErr) {
        console.error('Express dispatch error:', handlerErr);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Server dispatch failure',
            error: handlerErr.message
          });
        }
      }
    });
};
