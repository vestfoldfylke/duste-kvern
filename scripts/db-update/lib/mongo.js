const config = require("../config");
const { logger } = require("@vestfoldfylke/loglady");
const MongoClient = require("mongodb").MongoClient;
const { MONGODB_CONNECTION } = config;

let client = null;

/**
 *
 * @returns {MongoClient}
 */
module.exports = () => {
  if (!MONGODB_CONNECTION) {
    logger.error("mongo - missing MONGODB_CONNECTION");
    throw new Error("Missing env MONGODB_CONNECTION");
  }

  if (client === null) {
    client = new MongoClient(MONGODB_CONNECTION);
    logger.info("mongo - new client init");
    return client;
  }

  logger.info("mongo - client already exists");
  return client;
};
