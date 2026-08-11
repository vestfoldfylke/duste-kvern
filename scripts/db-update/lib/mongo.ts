import { logger } from "@vestfoldfylke/loglady";
import { MongoClient } from "mongodb";

let client: MongoClient | null = null;

const getClient = (): MongoClient => {
  if (!process.env.MONGODB_CONNECTION_STRING) {
    logger.error("mongo - missing MONGODB_CONNECTION_STRING");
    throw new Error("Missing env MONGODB_CONNECTION_STRING");
  }

  if (client === null) {
    client = new MongoClient(process.env.MONGODB_CONNECTION_STRING);
    logger.info("mongo - new client init");
    return client;
  }

  logger.info("mongo - client already exists");
  return client;
};

export default getClient;
