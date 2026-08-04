import { parentPort, threadId, workerData } from "node:worker_threads";
import { logger } from "@vestfoldfylke/loglady";
import { ObjectId } from "mongodb";
import { MONGODB } from "../config.js";
import { runInContext } from "./async-local-context.js";
import { closeMongoClient, getMongoClient } from "./mongo-client.js";
import { setupUserTests } from "./setup-user-tests.js";

parentPort?.postMessage("I started");

const handleSystemInWorker = async (system: any, correspondingSystemInOverview: any, report: any, mongoCollection: any) => {
  let getDataFunction: (user: any) => Promise<any>;

  try {
    const mod = await import(`../systems/${system.id}/get-data.js`);
    getDataFunction = mod.getData;
  } catch (err) {
    logger.errorException(err, "Could not find get-data-function (../systems/{FileSystemId}/get-data.js) for system {SystemId}", system.id, system.id);
    getDataFunction = async () => null;
  }

  let systemData: any;

  try {
    systemData = await getDataFunction(report.user);
  } catch (err: any) {
    logger.errorException(err, "Failed when running get-data-function for system {SystemId}", system.id);
    systemData = { getDataFailed: true, message: `Failed when running get-data-function for ${system.id}`, error: err.response?.data || err.stack || err.toString() };
  }

  correspondingSystemInOverview.data = systemData;

  const testsToRun = system.tests.filter((test: any) => !test.waitForAllData);
  for (const test of testsToRun) {
    logger.info("Running test {TestId} on system {SystemId}", test.id, system.id);
    test.mappedTestFunction(report.user, systemData);
  }

  correspondingSystemInOverview.finishedTimestamp = new Date().toISOString();
  correspondingSystemInOverview.runtime = new Date(correspondingSystemInOverview.finishedTimestamp).getTime() - new Date(correspondingSystemInOverview.startedTimestamp).getTime();

  logger.info("Finished running get-data-function and instant tests for system {SystemId}, saving to db", system.id);
  mongoCollection.updateOne({ _id: new ObjectId(report._id), "systems.id": system.id }, { $set: { "systems.$": correspondingSystemInOverview } });

  return { [system.id]: systemData };
};

const handleWaitingTestsInWorker = async (system: any, correspondingSystemInOverview: any, report: any, allData: any) => {
  const testsToRun = system.tests.filter((test: any) => test.waitForAllData);

  for (const test of testsToRun) {
    logger.info("Running test {TestId} on system {SystemId}", test.id, system.id);
    test.mappedTestFunction(report.user, correspondingSystemInOverview.data, allData);
  }

  logger.info("Finished running waiting tests for system {SystemId}", system.id);
};

const report = workerData;

const logContext = {
  prefix: `dust-report-worker - Thread Id: ${threadId} - Report Id: ${report._id} - Caller: ${report.caller.upn} - User: ${report.user.userPrincipalName}`
};

await runInContext(logContext, async () => {
  logger.info("Starting");

  const mongoClient = await getMongoClient();
  const collection = mongoClient.db(MONGODB.DB_NAME).collection(MONGODB.REPORT_COLLECTION as string);

  logger.info("Setting up systems and tests");
  const { systemsOverview, systemsToHandle } = await setupUserTests(report.user.userType);

  collection.updateOne({ _id: new ObjectId(report._id) }, { $set: { systems: systemsOverview } });
  logger.info("Successfully set up systems and tests");

  const systemAndTestsPromises = systemsToHandle.map(async (system: any) => {
    const correspondingSystemInOverview = systemsOverview.find((sys: any) => sys.id === system.id);
    return handleSystemInWorker(system, correspondingSystemInOverview, report, collection);
  });

  const results = await Promise.all(systemAndTestsPromises);
  logger.info("Finished fetching data and running immediate tests, running waiting tests");

  const allData = Object.assign({}, ...results);
  for (const system of systemsToHandle) {
    const correspondingSystemInOverview = systemsOverview.find((sys: any) => sys.id === system.id);
    handleWaitingTestsInWorker(system, correspondingSystemInOverview, report, allData);
  }
  logger.info("Finished running waiting tests data and running immediate tests, updating result in mongodb");

  const finishedTimestamp = new Date();
  const serverRuntime = finishedTimestamp.getTime() - new Date(report.startedTimestamp).getTime();
  const totalRuntime = finishedTimestamp.getTime() - new Date(report.createdTimestamp).getTime();
  await collection.updateOne({ _id: new ObjectId(report._id) }, { $set: { finishedTimestamp: finishedTimestamp.toISOString(), serverRuntime, totalRuntime, systems: systemsOverview } });

  closeMongoClient();
  logger.info("Finished report");
  parentPort?.postMessage("I'm done");
});
