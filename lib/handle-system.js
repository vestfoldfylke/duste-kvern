const { logger } = require("@vestfoldfylke/loglady");
const { ObjectId } = require("mongodb");

const handleSystem = async (system, correspondingSystemInOverview, report, mongoCollection) => {
  // Hent data for systemet
  let systemData;
  let getDataFunction;

  try {
    getDataFunction = require(`../systems/${system.id}/get-data.js`).getData; // ALL Get-data functions must be called getData!!!
  } catch (error) {
    logger.errorException(error, "handle-system - Could not find get-data-function (../systems/{FileSystemId}/get-data.js) for system {SystemId}", system.id, system.id);
    getDataFunction = async () => {
      return null;
    };
  }

  try {
    systemData = await getDataFunction(report.user);
  } catch (error) {
    logger.errorException(error, "handle-system - Failed when running get-data-function for SystemId {SystemId}", system.id);
    systemData = {
      getDataFailed: true,
      message: `Failed when running get-data-function for ${system.id}`,
      error: error.response?.data || error.stack || error.toString(),
      customMessage: error.customMessage || null
    };
  }

  // Set systemData in overviewObject
  correspondingSystemInOverview.data = systemData;

  // Kjør alle testene som er definert for denne userTypen og som kan fyres med en gang
  const testsToRun = system.tests.filter((test) => !test.waitForAllData);
  for (const test of testsToRun) {
    logger.info("handle-system - Running test {TestId} on system {SystemId}", test.id, system.id);
    test.mappedTestFunction(report.user, systemData); // The test itself will update the result in the systemsOverview object, and also handle internal errors in the test (if they occur)
  }

  // Sett system til ferdig hentet (selv om muligens noen tester gjenstår da..)
  correspondingSystemInOverview.finishedTimestamp = new Date().toISOString();
  correspondingSystemInOverview.runtime = new Date(correspondingSystemInOverview.finishedTimestamp) - new Date(correspondingSystemInOverview.startedTimestamp);

  // Oppdater i mongo når data er hentet og instant coffee-tests have run
  logger.info("handle-system - Finished running get-data-function and instant tests for system {SystemId}, saving to db", system.id);
  try {
    // Kanskje ta vekk trycatchen her
    mongoCollection.updateOne({ _id: new ObjectId(report._id), "systems.id": system.id }, { $set: { "systems.$": correspondingSystemInOverview } });
  } catch (error) {
    logger.errorException(error, "handle-system - Failed when updating corresponding system in overview for system {SystemId}", system.id);
  }

  return { [system.id]: systemData };
};

// Kjører resten av testene som venter (trenger bare cpu stort sett nå, så det tar den tiden det tar (hvis ikke vi multithreader))
const handleWaitingTests = async (system, correspondingSystemInOverview, report, allData) => {
  const testsToRun = system.tests.filter((test) => test.waitForAllData);

  for (const test of testsToRun) {
    logger.info("handle-system - Running test {TestId} on system {SystemId}", test.id, system.id);
    test.mappedTestFunction(report.user, correspondingSystemInOverview.data, allData); // The test itself will update the result in the systemsOverview object, and also handle internal errors in the test (if they occur)
  }

  logger.info("handle-system - Finished running waiting tests for system {SystemId}", system.id);
};

module.exports = { handleSystem, handleWaitingTests };
