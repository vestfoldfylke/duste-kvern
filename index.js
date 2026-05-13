(async () => {
  const { MONGODB, GET_NEW_REPORTS_INTERVAL } = require("./config");
  const { getMongoClient } = require("./lib/mongo-client");
  const { logger } = require("@vestfoldfylke/loglady");
  const { handleDustReport } = require("./lib/handle-dust-report");

  let readyForNewReports = true;

  const getAndRunNewReports = async () => {
    if (!readyForNewReports) {
      logger.warn("index - Not ready for run - skipping");
      return null;
    }

    readyForNewReports = false;

    try {
      // Get ready reports from mongodb
      const client = await getMongoClient();
      const db = client.db(MONGODB.DB_NAME);
      const collection = db.collection(MONGODB.REPORT_COLLECTION);
      const newReports = await collection.find({ ready: true }).toArray(); // Consider sorting on oldest - hmmm can we find and update at the same time check out findAndModify

      const updateProps = { ready: false, queued: true, running: true, startedTimestamp: new Date().toISOString() }; // To make sure we set the same values both in memory, and in mongodb when running updateMany

      // Set requests in mongodb to running
      await collection.updateMany({ _id: { $in: newReports.map((doc) => doc._id) } }, { $set: updateProps });
      readyForNewReports = true;

      if (newReports.length > 0) {
        logger.info("index - getAndRunNewReports - Got {NewReportCount} new reports", newReports.length);
      }

      newReports.forEach((report) => {
        report = { ...report, ...updateProps };
        handleDustReport(report);
      });

      return newReports.length;
    } catch (error) {
      logger.errorException(error, "index - getAndRunNewReports - Failed when getting new reports");
      readyForNewReports = true;
      return null;
    } finally {
      await logger.flush();
    }
  };

  // Run getReadyRequest every GET_NEW_REPORTS_INTERVAL seconds
  setInterval(getAndRunNewReports, GET_NEW_REPORTS_INTERVAL);
  // Run runReadyRequest every RUN_READY_REPORTS_INTERVAL seconds
  // setInterval(runReadyReports, RUN_READY_REPORTS_INTERVAL)
})();
