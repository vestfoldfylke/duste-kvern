import { logger } from "@vestfoldfylke/loglady";
import { MongoClient } from "mongodb";
import { MONGODB } from "../config.js";

let client: MongoClient | null = null;

export const getMongoClient = async (): Promise<MongoClient> => {
  if (client) {
    return client;
  }

  logger.info("mongo-client - Client does not exist - creating");
  client = new MongoClient(MONGODB.CONNECTION_STRING as string);
  await client.connect();
  logger.info("mongo-client - Client connected");

  return client;
};

export const closeMongoClient = (): void => {
  if (client) {
    client.close();
  }
};
