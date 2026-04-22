const { MONGODB } = require("../config");
const { logger } = require("@vestfoldfylke/loglady");
const { ObjectId } = require("mongodb");
const { runInContext } = require("./async-local-context");
const { handleSystem, handleWaitingTests } = require("./handle-system");
const { getMongoClient } = require("./mongo-client");
const { setupUserTests } = require("./setup-user-tests");

const handleDustReport = async (report) => {
  const logContext = {
    prefix: `handle-dust-report - Report Id: ${report._id} - Caller: ${report.caller.upn} - User: ${report.user.userPrincipalName}`
  };

  await runInContext(logContext, async () => {
    logger.info("Starting");

    // De under må i en trycatch etterhvert
    const mongoClient = await getMongoClient();
    const collection = mongoClient.db(MONGODB.DB_NAME).collection(MONGODB.REPORT_COLLECTION);

    // Set up systems and tests for this user type - save to mongodb as we go
    logger.info("Setting up systems and tests");
    const { systemsOverview, systemsToHandle } = setupUserTests(report.user.userType); // Gets tests for user type and sets some metadata (like startedTimestamp osv)

    collection.updateOne({ _id: new ObjectId(report._id) }, { $set: { systems: systemsOverview } }); // Just fire update - only make sure the last one goes ok :)
    logger.info("Successfully set up systems and tests");

    // Set up get data and testing as promises
    const systemAndTestsPromises = systemsToHandle.map(async (system) => {
      const correspondingSystemInOverview = systemsOverview.find((sys) => sys.id === system.id);
      return handleSystem(system, correspondingSystemInOverview, report, collection);
    });

    // Get data for system and run tests that don't require data from other systems than its own
    const results = await Promise.all(systemAndTestsPromises);
    logger.info("Finished fetching data and running immediate tests, running waiting tests");

    // Collect all results and get all tests that need data from other systems - then run these tests as promiseAll (we have all data now)
    const allData = Object.assign({}, ...results);
    // Run tests that need data from other systems than its own
    for (const system of systemsToHandle) {
      const correspondingSystemInOverview = systemsOverview.find((sys) => sys.id === system.id);
      handleWaitingTests(system, correspondingSystemInOverview, report, allData);
    }
    logger.info("Finished running waiting tests data and running immediate tests, updating result in mongodb");

    // Set to finished in db (along with new results)
    const finishedTimestamp = new Date();
    const serverRuntime = finishedTimestamp - new Date(report.startedTimestamp);
    const totalRuntime = finishedTimestamp - new Date(report.createdTimestamp);
    await collection.updateOne({ _id: new ObjectId(report._id) }, { $set: { finishedTimestamp: finishedTimestamp.toISOString(), serverRuntime, totalRuntime, systems: systemsOverview } });

    logger.info("Finished report");
    return "Finished";
  });
};

module.exports = { handleDustReport };
