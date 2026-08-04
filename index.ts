import { logger } from "@vestfoldfylke/loglady";
import { GET_NEW_REPORTS_INTERVAL, MONGODB } from "./config.js";
import { handleDustReport } from "./lib/handle-dust-report.js";
import { getMongoClient } from "./lib/mongo-client.js";

let readyForNewReports = true;

const getAndRunNewReports = async (): Promise<number | null> => {
  if (!readyForNewReports) {
    logger.warn("index - Not ready for run - skipping");
    return null;
  }

  readyForNewReports = false;

  try {
    const client = await getMongoClient();
    const db = client.db(MONGODB.DB_NAME);
    const collection = db.collection(MONGODB.REPORT_COLLECTION as string);
    const newReports = await collection.find({ ready: true }).toArray();

    const updateProps = { ready: false, queued: true, running: true, startedTimestamp: new Date().toISOString() };

    await collection.updateMany({ _id: { $in: newReports.map((doc: any) => doc._id) } }, { $set: updateProps });
    readyForNewReports = true;

    if (newReports.length > 0) {
      logger.info("index - getAndRunNewReports - Got {NewReportCount} new reports", newReports.length);
    }

    newReports.forEach((report: any) => {
      const merged = { ...report, ...updateProps };
      handleDustReport(merged);
    });

    return newReports.length;
  } catch (err) {
    logger.errorException(err, "index - getAndRunNewReports - Failed when getting new reports");
    readyForNewReports = true;
    return null;
  } finally {
    await logger.flush();
  }
};

setInterval(getAndRunNewReports, Number(GET_NEW_REPORTS_INTERVAL));
