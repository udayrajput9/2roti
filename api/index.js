const { app } = require('../api-server/src/server');
const { initSchema } = require('../api-server/src/models/schema');

let isInitialized = false;

module.exports = async (req, res) => {
  if (!isInitialized) {
    try {
      await initSchema();
      isInitialized = true;
    } catch (err) {
      console.error('Serverless DB schema init error:', err);
    }
  }
  return app(req, res);
};
