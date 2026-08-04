import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "@vestfoldfylke/loglady";
import { getDusteUsers } from "./lib/get-duste-users.js";
import mongo from "./lib/mongo.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
if (args.length === 0) {
  logger.warn("lib - update-database - Tell me what update to do!\n- users\n- sds");
  process.exit(1);
}

const updateType = args[0].toLowerCase();

let data: any[];
if (updateType === "users") {
  try {
    data = await getDusteUsers();
  } catch (err) {
    logger.errorException(err, "Error when fetching duste-users from graph");

    await logger.flush();
    process.exit(1);
  }
} else {
  const raw = await readFile(join(__dirname, `./data/${updateType}.json`), "utf-8");
  data = JSON.parse(raw);
}

const mongoClient = mongo();
const db = mongoClient.db(process.env.MONGODB_DB_NAME).collection(process.env.MONGODB_USERS_COLLECTION as string);

if (updateType === "users") {
  const now = new Date().toISOString();
  data = data.map((user: any) => {
    if (!user.displayName) {
      return user;
    }

    if (!user.surname) {
      return user;
    }

    return {
      ...user,
      displayNameLowerCase: user.displayName.toLowerCase(),
      surNameLowerCase: user.surname.toLowerCase(),
      updatedAt: now
    };
  });

  const usersPath = join(__dirname, "./data/users.json");
  await writeFile(usersPath, JSON.stringify(data, null, 2));
}

try {
  logger.info("lib - update-database - UpdateType: {UpdateType} - clear collection", updateType);
  await db.drop();
} catch (err) {
  logger.errorException(err, "lib - update-database - UpdateType: {UpdateType} - unable to clear collection", updateType);

  await logger.flush();
  process.exit(1);
}

logger.info("lib - update-database - UpdateType: {UpdateType} - insert data - {DataLength} - start", updateType, data.length);
try {
  const result = await db.insertMany(data);
  logger.info("lib - update-database - UpdateType: {UpdateType} - insert data - InsertedCount: {InsertedCount}", updateType, result.insertedCount);
} catch (err) {
  logger.errorException(err, "lib - update-database - UpdateType: {UpdateType} - update data - failed to insert data", updateType);

  await logger.flush();
  process.exit(2);
}

if (updateType === "users") {
  await db.createIndex({ displayNameLowerCase: 1 }, { background: true });
  await db.createIndex({ surNameLowerCase: 1 }, { background: true });
  await db.createIndex({ samAccountName: 1 }, { background: true });
  await db.createIndex({ feidenavn: 1 }, { background: true });
  await db.createIndex({ userPrincipalName: 1 }, { background: true });
}

logger.info("lib - update-database - UpdateType: {UpdateType} - finished", updateType);
await mongoClient.close();

await logger.flush();
process.exit(0);
