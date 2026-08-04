import { logger } from "@vestfoldfylke/loglady";
import { error, ignore } from "./test-result.js";

const setupSystemOverview = (system: any) => {
  const tests = system.tests.map((test: any) => {
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

const setupSystemTests = (system: any, systemOverview: any[]) => {
  const systemTests = system.tests.map((testObj: any) => {
    const correspondingTestInSystemOverview = systemOverview.find((sys) => sys.id === system.id).tests.find((test: any) => test.id === testObj.id);
    const mappedTestFunction = (user: any, systemData: any, allData?: any) => {
      if (systemData?.getDataFailed) {
        correspondingTestInSystemOverview.result = ignore();
        return null;
      }

      try {
        correspondingTestInSystemOverview.result = testObj.test(user, systemData, allData);
      } catch (err: any) {
        logger.errorException(err, "Internal error in test {TestId}", testObj.id);
        correspondingTestInSystemOverview.result = error({ message: "Internal error in test", solution: "Be dust-utviklerne fikse koden sin...", raw: err.stack || err.toString() });
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

export const setupUserTests = async (userType: string) => {
  logger.info("setup-user-tests - UserType: {UserType} - Starting", userType);
  let userFlow: { systemsAndTests: any[] };

  try {
    userFlow = await import(`../user-types/${userType}.js`);
  } catch (err) {
    logger.errorException(err, "setup-user-tests - Could not find user-type file (../user-types/{FileUserType}.js) for UserType: {UserType}", userType, userType);
    return { systemsOverview: [], systemsToHandle: [] };
  }

  const systemsOverview = userFlow.systemsAndTests.map((system: any) => setupSystemOverview(system));
  const systemsToHandle = userFlow.systemsAndTests.map((system: any) => setupSystemTests(system, systemsOverview));

  logger.info("setup-user-tests - UserType: {UserType} - Finished", userType);
  return { systemsOverview, systemsToHandle };
};
