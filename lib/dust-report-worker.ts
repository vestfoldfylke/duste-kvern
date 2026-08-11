import { parentPort, threadId, workerData } from "node:worker_threads";
import { logger } from "@vestfoldfylke/loglady";
import type { Collection, MongoClient, WithId } from "mongodb";
import { MONGODB } from "../config.js";
import type { AllSystemData, SystemData } from "../types/system-data.js";
import type { Report, SystemTests, SystemWithTestsResult, TestCase } from "../types/system-tests.js";
import type { GetData, SystemInWorkerResponse } from "../types/worker.js";
import { runInContext } from "./async-local-context.js";
import { CustomError } from "./CustomError.js";
import { HTTPError } from "./helpers/HTTPError.js";
import { closeMongoClient, getMongoClient } from "./mongo-client.js";
import { setupUserTests } from "./setup-user-tests.js";

parentPort?.postMessage("I started");

const handleSystemInWorker = async (
  system: SystemTests,
  correspondingSystemInOverview: SystemWithTestsResult,
  report: WithId<Report>,
  mongoCollection: Collection<Report>
): Promise<SystemInWorkerResponse> => {
  let getDataFunction: GetData;

  try {
    const mod: { getData: GetData } = await import(`../systems/${system.id}/get-data.js`);
    getDataFunction = mod.getData;
  } catch (err) {
    logger.errorException(err, "Could not find get-data-function (../systems/{FileSystemId}/get-data.js) for system {SystemId}", system.id, system.id);
    getDataFunction = async () => null;
  }

  let systemData: SystemData | null;

  try {
    systemData = await getDataFunction(report.user);
  } catch (err) {
    logger.errorException(err, "Failed when running get-data-function for system {SystemId}", system.id);

    if (err instanceof HTTPError) {
      systemData = {
        getDataFailed: true,
        message: `Failed when running get-data-function for ${system.id}`,
        error: err?.data || err.stack || err.toString()
      };
    } else if (err instanceof CustomError) {
      systemData = {
        getDataFailed: true,
        message: `Failed when running get-data-function for ${system.id}`,
        error: err.stack || err.toString(),
        customMessage: err.customMessage || null
      };
    } else {
      const error = err as Error;
      systemData = {
        getDataFailed: true,
        message: `Failed when running get-data-function for ${system.id}`,
        error: error.stack || error.toString()
      };
    }
  }

  correspondingSystemInOverview.data = systemData as SystemData;

  const testsToRun: TestCase[] = system.tests.filter((test: TestCase) => !test.waitForAllData);
  for (const test of testsToRun) {
    logger.info("Running test {TestId} on system {SystemId}", test.id, system.id);
    test.mappedTestFunction?.(report.user, systemData as SystemData);
  }

  correspondingSystemInOverview.finishedTimestamp = new Date().toISOString();
  if (!correspondingSystemInOverview.startedTimestamp) {
    logger.warn(
      "startedTimestamp is not set on correspondingSystemInOverview for system {System} in ReportId {ReportId}. Setting it to the same as finishedTimestamp",
      system.id,
      report._id.toString()
    );
    correspondingSystemInOverview.startedTimestamp = correspondingSystemInOverview.finishedTimestamp;
  }
  correspondingSystemInOverview.runtime = new Date(correspondingSystemInOverview.finishedTimestamp).getTime() - new Date(correspondingSystemInOverview.startedTimestamp).getTime();

  logger.info("Finished running get-data-function and instant tests for system {SystemId}, saving to db", system.id);
  mongoCollection.updateOne({ _id: report._id, "systems.id": system.id }, { $set: { "systems.$": correspondingSystemInOverview } });

  return { [system.id]: systemData };
};

const handleWaitingTestsInWorker = async (system: SystemTests, correspondingSystemInOverview: SystemWithTestsResult, report: WithId<Report>, allData: AllSystemData): Promise<void> => {
  const testsToRun: TestCase[] = system.tests.filter((test: TestCase) => test.waitForAllData);

  for (const test of testsToRun) {
    logger.info("Running test {TestId} on system {SystemId}", test.id, system.id);
    test.mappedTestFunction?.(report.user, correspondingSystemInOverview.data, allData);
  }

  logger.info("Finished running waiting tests for system {SystemId}", system.id);
};

const report: WithId<Report> = workerData;

const logContext = {
  prefix: `dust-report-worker - Thread Id: ${threadId} - Report Id: ${report._id} - Caller: ${report.caller.upn} - User: ${report.user.userPrincipalName}`
};

await runInContext(logContext, async () => {
  logger.info("Starting thread worker");

  if (!MONGODB.REPORT_COLLECTION) {
    logger.error("MONGODB_REPORT_COLLECTION not set. Have you forgotten something?");
    await logger.flush();
    process.exit(1);
  }

  const mongoClient: MongoClient = await getMongoClient();
  const collection: Collection<Report> = mongoClient.db(MONGODB.DB_NAME).collection<Report>(MONGODB.REPORT_COLLECTION);

  logger.info("Setting up systems and tests");
  const { systemsOverview, systemsToHandle } = await setupUserTests(report.user.userType);

  collection.updateOne({ _id: report._id }, { $set: { systems: systemsOverview } });
  logger.info("Successfully set up systems and tests");

  const systemAndTestsPromises: Promise<SystemInWorkerResponse>[] = [];
  for (const system of systemsToHandle) {
    const correspondingSystemInOverview: SystemWithTestsResult | undefined = systemsOverview.find((sys: SystemWithTestsResult) => sys.id === system.id);
    if (!correspondingSystemInOverview) {
      logger.error("correspondingSystemInOverview for SystemId {SystemId} not found. Skipping system!", system.id);
      continue;
    }

    systemAndTestsPromises.push(handleSystemInWorker(system, correspondingSystemInOverview, report, collection));
  }

  const results: SystemInWorkerResponse[] = await Promise.all(systemAndTestsPromises);
  logger.info("Finished fetching data and running immediate tests, running waiting tests");

  const allData: AllSystemData = Object.assign({}, ...results);
  const waitingTestsPromises: Promise<void>[] = [];
  for (const system of systemsToHandle) {
    const correspondingSystemInOverview: SystemWithTestsResult | undefined = systemsOverview.find((sys: SystemWithTestsResult) => sys.id === system.id);
    if (!correspondingSystemInOverview) {
      logger.error("correspondingSystemInOverview for waiting SystemId {SystemId} not found. Skipping system!", system.id);
      continue;
    }

    waitingTestsPromises.push(handleWaitingTestsInWorker(system, correspondingSystemInOverview, report, allData));
  }

  await Promise.all(waitingTestsPromises);
  logger.info("Finished running waiting tests data and running immediate tests, updating result in mongodb");

  const finishedTimestamp: Date = new Date();

  if (!report.startedTimestamp) {
    logger.warn("startedTimestamp is not set on ReportId {ReportId}. Setting it to the same as finishedTimestamp", report._id.toString());
    report.startedTimestamp = finishedTimestamp.toISOString();
  }

  const serverRuntime: number = finishedTimestamp.getTime() - new Date(report.startedTimestamp).getTime();
  const totalRuntime: number = finishedTimestamp.getTime() - new Date(report.createdTimestamp).getTime();
  await collection.updateOne({ _id: report._id }, { $set: { finishedTimestamp: finishedTimestamp.toISOString(), serverRuntime, totalRuntime, systems: systemsOverview } });

  await closeMongoClient();
  logger.info("Finished report");
  parentPort?.postMessage("Thread worker done");
});
