(async () => {
  const { MONGODB, GET_NEW_REPORTS_INTERVAL } = require("./config");
  const { Worker } = require("node:worker_threads");
  const { logger } = require("@vestfoldfylke/loglady");
  const { getMongoClient } = require("./lib/mongo-client");

  const workerFile = "./lib/dust-report-worker.js";

  let readyForNewReports = true;

  const getAndRunNewReports = async () => {
    if (!readyForNewReports) {
      logger.warn("indexThreader - Not ready for run - skipping");
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
        logger.info("indexThreader - getAndRunNewReports - Got {NewReportCount} new reports", newReports.length);
      }

      newReports.forEach((report) => {
        report._id = report._id.toString(); // workers don't handle mongodb type in workerData-transfer
        report = { ...report, ...updateProps };
        const worker = new Worker(workerFile, { workerData: report });
        logger.info("indexThreader - Starting worker with Thread Id {WorkerThreadId}", worker.threadId);
        worker.on("message", (msg) => {
          logger.info("indexThreader - Message from worker with Thread Id {WorkerThreadId}, Message: {Message}", worker.threadId, msg);
        });
        worker.on("error", (err) => {
          logger.errorException(err, "indexThreader - Error on worker with Thread Id {WorkerThreadId}", worker.threadId);
        });
        worker.on("exit", (code) => {
          logger.info("indexThreader - Worker finished on Thread Id {WorkerThreadId} with exit code {Code}", worker.threadId, code);
        });
        logger.info("indexThreader - Worker started");
      });

      return newReports.length;
    } catch (error) {
      logger.errorException(error, "indexThreader - Failed when getting new reports");
      readyForNewReports = true;
      return null;
    }
  };

  // Run getReadyRequest every GET_NEW_REPORTS_INTERVAL seconds
  setInterval(getAndRunNewReports, GET_NEW_REPORTS_INTERVAL);
})();
