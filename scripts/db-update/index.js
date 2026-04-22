(async () => {
  const { MONGODB_USERS_NAME, MONGODB_USERS_COLLECTION } = require("./config");
  const { logger } = require("@vestfoldfylke/loglady");

  const args = process.argv.slice(2);
  if (args.length === 0) {
    logger.warn("lib - update-database - Tell me what update to do!\n- users\n- sds");
    process.exit(1);
  }

  const updateType = args[0].toLowerCase();

  const { join } = require("node:path");
  const { writeFileSync } = require("node:fs");
  const { getDusteUsers } = require("./lib/get-duste-users");
  const mongo = require("./lib/mongo");

  const sleep = (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };

  let data;
  if (updateType === "users") {
    try {
      data = await getDusteUsers();
    } catch (error) {
      logger.errorException(error, "Error when fetching duste-users from graph");
      await sleep(1000);
      process.exit(1);
    }
  } else {
    data = require(`./data/${updateType}.json`);
  }

  const mongoClient = mongo();
  const db = mongoClient.db(MONGODB_USERS_NAME).collection(MONGODB_USERS_COLLECTION);

  if (updateType === "users") {
    const now = new Date().toISOString();
    data = data.map((user) => {
      if (!user.displayName) return user;
      if (!user.surname) return user;
      return {
        ...user,
        displayNameLowerCase: user.displayName.toLowerCase(),
        surNameLowerCase: user.surname.toLowerCase(),
        updatedAt: now
      };
    });
    const usersPath = join(__dirname, "./data/users.json");
    writeFileSync(usersPath, JSON.stringify(data, null, 2));
  }

  try {
    logger.info("lib - update-database - UpdateType: {UpdateType} - clear collection", updateType);
    // await db.deleteMany({})
    await db.drop();
  } catch (error) {
    logger.errorException(error, "lib - update-database - UpdateType: {UpdateType} - unable to clear collection", updateType);
    await sleep(1000);
    process.exit(1);
  }

  logger.info("lib - update-database - UpdateType: {UpdateType} - insert data - {DataLength} - start", updateType, data.length);
  try {
    const result = await db.insertMany(data);
    logger.info("lib - update-database - UpdateType: {UpdateType} - insert data - InsertedCount: {InsertedCount}", updateType, result.insertedCount);
  } catch (error) {
    logger.errorException(error, "lib - update-database - UpdateType: {UpdateType} - update data - failed to insert data", updateType);
    await sleep(1000);
    process.exit(2);
  }

  // Create index on searchfields for fun
  if (updateType === "users") {
    await db.createIndex({ displayNameLowerCase: 1 }, { background: true });
    await db.createIndex({ surNameLowerCase: 1 }, { background: true });
    await db.createIndex({ samAccountName: 1 }, { background: true });
    await db.createIndex({ feidenavn: 1 }, { background: true });
    await db.createIndex({ userPrincipalName: 1 }, { background: true });
  }

  logger.info("lib - update-database - UpdateType: {UpdateType} - finished", updateType);
  await mongoClient.close();
  await sleep(1000);
  process.exit(0);
})();
