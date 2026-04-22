const { AsyncLocalStorage } = require("node:async_hooks");
const { logger } = require("@vestfoldfylke/loglady");

const asyncLocalStorage = new AsyncLocalStorage();

async function runInContext(logConfig, callback) {
  logger.setContextProvider(() => asyncLocalStorage.getStore());
  return asyncLocalStorage.run(logConfig, callback);
}

function updateContext(logConfig) {
  const _logConfig = asyncLocalStorage.getStore();
  if (_logConfig) {
    Object.assign(_logConfig, logConfig);
  }
}

module.exports = {
  runInContext,
  updateContext
};
