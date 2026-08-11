import { logger } from "@vestfoldfylke/loglady";
import { type Collection, ObjectId, type WithId } from "mongodb";
import type { AllSystemData, SystemData } from "../types/system-data.js";
import type { Report, SystemTests, SystemWithTestsResult, TestCase } from "../types/system-tests.js";
import type { GetData, SystemInWorkerResponse } from "../types/worker.js";
import { CustomError } from "./CustomError.js";
import { HTTPError } from "./helpers/HTTPError.js";

export const handleSystem = async (
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
    logger.errorException(err, "handle-system - Could not find get-data-function (../systems/{FileSystemId}/get-data.js) for system {SystemId}", system.id, system.id);
    getDataFunction = async () => null;
  }

  let systemData: SystemData | null;

  try {
    systemData = await getDataFunction(report.user);
  } catch (err) {
    logger.errorException(err, "handle-system - Failed when running get-data-function for SystemId {SystemId}", system.id);

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

  correspondingSystemInOverview.data = systemData;

  const testsToRun: TestCase[] = system.tests.filter((test: TestCase) => !test.waitForAllData);
  for (const test of testsToRun) {
    logger.info("handle-system - Running test {TestId} on system {SystemId}", test.id, system.id);
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

  logger.info("handle-system - Finished running get-data-function and instant tests for system {SystemId}, saving to db", system.id);
  try {
    mongoCollection.updateOne({ _id: new ObjectId(report._id), "systems.id": system.id }, { $set: { "systems.$": correspondingSystemInOverview } });
  } catch (err) {
    logger.errorException(err, "handle-system - Failed when updating corresponding system in overview for system {SystemId}", system.id);
  }

  return { [system.id]: systemData };
};

export const handleWaitingTests = async (system: SystemTests, correspondingSystemInOverview: SystemWithTestsResult, report: WithId<Report>, allData: AllSystemData): Promise<void> => {
  const testsToRun: TestCase[] = system.tests.filter((test: TestCase) => test.waitForAllData);

  for (const test of testsToRun) {
    logger.info("handle-system - Running test {TestId} on system {SystemId}", test.id, system.id);
    test.mappedTestFunction?.(report.user, correspondingSystemInOverview.data, allData);
  }

  logger.info("handle-system - Finished running waiting tests for system {SystemId}", system.id);
};
