import { logger } from "@vestfoldfylke/loglady";
import { ObjectId } from "mongodb";

export const handleSystem = async (system: any, correspondingSystemInOverview: any, report: any, mongoCollection: any) => {
  let getDataFunction: (user: any) => Promise<any>;

  try {
    const mod = await import(`../systems/${system.id}/get-data.js`);
    getDataFunction = mod.getData;
  } catch (err) {
    logger.errorException(err, "handle-system - Could not find get-data-function (../systems/{FileSystemId}/get-data.js) for system {SystemId}", system.id, system.id);
    getDataFunction = async () => null;
  }

  let systemData: any;

  try {
    systemData = await getDataFunction(report.user);
  } catch (err: any) {
    logger.errorException(err, "handle-system - Failed when running get-data-function for SystemId {SystemId}", system.id);
    systemData = {
      getDataFailed: true,
      message: `Failed when running get-data-function for ${system.id}`,
      error: err.response?.data || err.stack || err.toString(),
      customMessage: err.customMessage || null
    };
  }

  correspondingSystemInOverview.data = systemData;

  const testsToRun = system.tests.filter((test: any) => !test.waitForAllData);
  for (const test of testsToRun) {
    logger.info("handle-system - Running test {TestId} on system {SystemId}", test.id, system.id);
    test.mappedTestFunction(report.user, systemData);
  }

  correspondingSystemInOverview.finishedTimestamp = new Date().toISOString();
  correspondingSystemInOverview.runtime = new Date(correspondingSystemInOverview.finishedTimestamp).getTime() - new Date(correspondingSystemInOverview.startedTimestamp).getTime();

  logger.info("handle-system - Finished running get-data-function and instant tests for system {SystemId}, saving to db", system.id);
  try {
    mongoCollection.updateOne({ _id: new ObjectId(report._id), "systems.id": system.id }, { $set: { "systems.$": correspondingSystemInOverview } });
  } catch (err) {
    logger.errorException(err, "handle-system - Failed when updating corresponding system in overview for system {SystemId}", system.id);
  }

  return { [system.id]: systemData };
};

export const handleWaitingTests = async (system: any, correspondingSystemInOverview: any, report: any, allData: any) => {
  const testsToRun = system.tests.filter((test: any) => test.waitForAllData);

  for (const test of testsToRun) {
    logger.info("handle-system - Running test {TestId} on system {SystemId}", test.id, system.id);
    test.mappedTestFunction(report.user, correspondingSystemInOverview.data, allData);
  }

  logger.info("handle-system - Finished running waiting tests for system {SystemId}", system.id);
};
