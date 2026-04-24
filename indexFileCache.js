(async () => {
  const { MONGODB, GET_NEW_REPORTS_INTERVAL, RUN_READY_REPORTS_INTERVAL } = require("./config");
  const { getMongoClient } = require("./lib/mongo-client");
  const { logger } = require("@vestfoldfylke/loglady");
  const Cache = require("file-system-cache").default;
  const { handleDustReport } = require("./lib/handle-dust-report-file-cache");

  const fileCacheQueue = Cache({ basePath: "./.queue-file-cache", hash: "sha1" });

  let readyForNewReports = true;

  const getNewReports = async () => {
    if (!readyForNewReports) {
      logger.warn("indexFileCache - Not ready for run - skipping");
      return null;
    }

    readyForNewReports = false;

    try {
      // Get ready reports from mongodb
      const client = await getMongoClient();
      const db = client.db(MONGODB.DB_NAME);
      const collection = db.collection(MONGODB.REPORT_COLLECTION);
      const newReports = await collection.find({ ready: true }).toArray(); // Consider sorting on oldest - hmmm can we find and update at the same time check out findAndModify

      // Save reports to file-cache-queue - if it already exists, just overwrite - updateMany probably failed...
      const updateProps = { ready: false, queued: true, startedTimestamp: new Date().toISOString() }; // To make sure we set the same values both in cache, and in mongodb when running updateMany
      await fileCacheQueue.save(
        newReports.map((report) => {
          return { key: report._id.toString(), value: { ...report, ...updateProps } }; // request._id.toString() because mongoDb returns ObjectId(_id) intead of _id directly
        })
      );

      // Set requests in mongodb to running
      await collection.updateMany({ _id: { $in: newReports.map((doc) => doc._id) } }, { $set: updateProps });
      readyForNewReports = true;

      if (newReports.length > 0) {
        logger.info("indexFileCache - getNewReports - Got {NewReportCount} new reports", newReports.length);
      }
      return newReports.length;
    } catch (error) {
      logger.errorException(error, "indexFileCache - getNewReports - Failed when getting new reports");
      readyForNewReports = true;
      return null;
    } finally {
      await logger.flush();
    }
  };

  const runReadyReports = async () => {
    try {
      // Get all ready reports create promise for each, then set to running and save to queue again - and promise all
      const queue = (await fileCacheQueue.load()).files;
      const readyForRun = queue.filter((queueReport) => !queueReport.value.running).map((queueReport) => queueReport.value);
      // Set to running in filecache
      await fileCacheQueue.save(
        readyForRun.map((report) => {
          return { key: report._id, value: { ...report, running: true } };
        })
      );
      if (readyForRun.length > 0) {
        logger.info("indexFileCache - runReadyReports - Got {ReadyForRunCount} new reports", readyForRun.length);
      }

      /* Nope - we don't need the results, we only need to fire them
      // Set up promises
      const runPromises = readyForRun.map(async (report) => {
        return handleDustReport(report)
      })

      // Run all tests - I/O (network and file-system) in parallell, consider CPU (threads) in parallell as well if too slow
      const results = await Promise.all(runPromises)
      */

      // Simply trigger all (or maybe in separate threads? Or clusters?)
      readyForRun.forEach((report) => {
        handleDustReport(report);
      });
    } catch (error) {
      logger.errorException(error, "indexFileCache - runReadyReports - Failed when getting ready for run from fileCacheQueue");
    } finally {
      await logger.flush();
    }
  };

  // Run getReadyRequest every GET_NEW_REPORTS_INTERVAL seconds
  setInterval(getNewReports, GET_NEW_REPORTS_INTERVAL);
  // Run runReadyRequest every RUN_READY_REPORTS_INTERVAL seconds
  setInterval(runReadyReports, RUN_READY_REPORTS_INTERVAL);
})();
