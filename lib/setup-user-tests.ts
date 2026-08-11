import { logger } from "@vestfoldfylke/loglady";
import type { AllSystemData, SystemData } from "../types/system-data.js";
import type { SystemTests, SystemWithTestsAndData, SystemWithTestsResult, TestCase, TestCaseResult, TestUser, UserTests } from "../types/system-tests.js";
import { error, ignore, isFailedSystemData } from "./test-result.js";

const setupSystemOverview = (system: SystemWithTestsAndData): SystemWithTestsResult => {
  const tests: TestCaseResult[] = system.tests.map((test: TestCase) => {
    const { id, title, description, waitForAllData } = test;
    return {
      id,
      title,
      description,
      waitForAllData,
      result: null
    };
  });

  return {
    id: system.id,
    name: system.name,
    description: system.description,
    failed: false,
    startedTimestamp: new Date().toISOString(),
    finishedTimestamp: null,
    runtime: null,
    tests,
    data: null
  };
};

const setupSystemTests = (system: SystemWithTestsAndData, systemOverview: SystemWithTestsResult[]): SystemTests => {
  const systemTests: TestCase[] = system.tests.map((testObj: TestCase) => {
    const correspondingTestInSystemOverview: TestCaseResult | undefined = systemOverview
      .find((sys: SystemWithTestsResult) => sys.id === system.id)
      ?.tests.find((test: TestCaseResult) => test.id === testObj.id);
    if (!correspondingTestInSystemOverview) {
      logger.error("Corresponding system or test in system overview not found. SystemId: {SystemId}. TestId: {TestId}. SystemOverview: {@SystemOverview}", system.id, testObj.id, systemOverview);
      throw new Error(`Corresponding system or test in system overview not found. SystemId: ${system.id}. TestId: ${testObj.id}`);
    }

    const mappedTestFunction = (user: TestUser, systemData: SystemData | null | undefined, allData?: AllSystemData): void => {
      if (systemData === null) {
        logger.warn("systemData is null. Setting to undefined...");
        systemData = undefined;
      }

      if (isFailedSystemData(systemData)) {
        correspondingTestInSystemOverview.result = ignore();
        return;
      }

      try {
        correspondingTestInSystemOverview.result = testObj.test(user, systemData, allData ?? {});
      } catch (err) {
        logger.errorException(err, "Internal error in test {TestId} in system {SystemId}", testObj.id, system.id);
        const errorObject = err as Error;
        correspondingTestInSystemOverview.result = error({ message: "Internal error in test", solution: "Be dust-utviklerne fikse koden sin...", raw: errorObject.stack || errorObject.toString() });
      }
    };

    return {
      ...testObj,
      mappedTestFunction
    };
  });

  return {
    id: system.id,
    tests: systemTests
  };
};

export const setupUserTests = async (userType: string): Promise<UserTests> => {
  logger.info("setup-user-tests - UserType: {UserType} - Starting", userType);
  let userFlow: { systemsAndTests: SystemWithTestsAndData[] };

  try {
    userFlow = await import(`../user-types/${userType}.js`);
  } catch (err) {
    logger.errorException(err, "setup-user-tests - Could not find user-type file (../user-types/{FileUserType}.js) for UserType: {UserType}", userType, userType);
    return { systemsOverview: [], systemsToHandle: [] };
  }

  const systemsOverview: SystemWithTestsResult[] = userFlow.systemsAndTests.map((system: SystemWithTestsAndData) => setupSystemOverview(system));
  const systemsToHandle: SystemTests[] = userFlow.systemsAndTests.map((system: SystemWithTestsAndData) => setupSystemTests(system, systemsOverview));

  logger.info("setup-user-tests - UserType: {UserType} - Finished", userType);
  return { systemsOverview, systemsToHandle };
};
