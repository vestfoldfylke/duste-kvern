import { logger } from "@vestfoldfylke/loglady";
import { ObjectId } from "mongodb";
import { MONGODB } from "../config.js";
import { runInContext } from "./async-local-context.js";
import { handleSystem, handleWaitingTests } from "./handle-system.js";
import { getMongoClient } from "./mongo-client.js";
import { setupUserTests } from "./setup-user-tests.js";

export const handleDustReport = async (report: any): Promise<void> => {
  const logContext = {
    prefix: `handle-dust-report - Report Id: ${report._id} - Caller: ${report.caller.upn} - User: ${report.user.userPrincipalName}`
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
      return handleSystem(system, correspondingSystemInOverview, report, collection);
    });

    const results = await Promise.all(systemAndTestsPromises);
    logger.info("Finished fetching data and running immediate tests, running waiting tests");

    const allData = Object.assign({}, ...results);
    for (const system of systemsToHandle) {
      const correspondingSystemInOverview = systemsOverview.find((sys: any) => sys.id === system.id);
      handleWaitingTests(system, correspondingSystemInOverview, report, allData);
    }
    logger.info("Finished running waiting tests data and running immediate tests, updating result in mongodb");

    const finishedTimestamp = new Date();
    const serverRuntime = finishedTimestamp.getTime() - new Date(report.startedTimestamp).getTime();
    const totalRuntime = finishedTimestamp.getTime() - new Date(report.createdTimestamp).getTime();
    await collection.updateOne({ _id: new ObjectId(report._id) }, { $set: { finishedTimestamp: finishedTimestamp.toISOString(), serverRuntime, totalRuntime, systems: systemsOverview } });

    logger.info("Finished report");
    return "Finished";
  });
};
