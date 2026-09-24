const { app } = require('../api-server/src/server');
const { initSchema } = require('../api-server/src/models/schema');

let initPromise = null;

function ensureInitialized() {
  if (!initPromise) {
    initPromise = initSchema().catch(err => {
      console.error('Serverless DB schema init error:', err);
      initPromise = null; // Allow retry on transient failure
    });
  }
  return initPromise;
}

module.exports = async (req, res) => {
  await ensureInitialized();
  return app(req, res);
};
