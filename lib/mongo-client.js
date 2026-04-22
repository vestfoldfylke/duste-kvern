const { MONGODB } = require("../config");
const { MongoClient } = require("mongodb");
const { logger } = require("@vestfoldfylke/loglady");

let client = null;

/**
 *
 * @returns { import('mongodb').MongoClient }
 */
const getMongoClient = async () => {
  if (!client) {
    logger.info("mongo-client - Client does not exist - creating");
    client = new MongoClient(MONGODB.CONNECTION_STRING);
    await client.connect();
    logger.info("mongo-client - Client connected");
  }
  return client;
};

const closeMongoClient = () => {
  if (client) client.close();
};

module.exports = { getMongoClient, closeMongoClient };
