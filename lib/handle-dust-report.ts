import { logger } from "@vestfoldfylke/loglady";
import type { Collection, MongoClient, WithId } from "mongodb";
import { MONGODB } from "../config.js";
import type { AllSystemData } from "../types/system-data.js";
import type { Report, SystemWithTestsResult } from "../types/system-tests.js";
import type { SystemInWorkerResponse } from "../types/worker.js";
import { runInContext } from "./async-local-context.js";
import { handleSystem, handleWaitingTests } from "./handle-system.js";
import { getMongoClient } from "./mongo-client.js";
import { setupUserTests } from "./setup-user-tests.js";

export const handleDustReport = async (report: WithId<Report>): Promise<void> => {
  const logContext = {
    prefix: `handle-dust-report - Report Id: ${report._id.toString()} - Caller: ${report.caller.upn} - User: ${report.user.userPrincipalName}`
  };

  await runInContext(logContext, async () => {
    logger.info("Starting dust report");

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

      systemAndTestsPromises.push(handleSystem(system, correspondingSystemInOverview, report, collection));
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

      waitingTestsPromises.push(handleWaitingTests(system, correspondingSystemInOverview, report, allData));
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

    logger.info("Dust report finished");
    return "Finished";
  });
};
