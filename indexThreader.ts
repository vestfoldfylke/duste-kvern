import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";
import { logger } from "@vestfoldfylke/loglady";
import type { Collection, Db, MongoClient, WithId } from "mongodb";
import { GET_NEW_REPORTS_INTERVAL, MONGODB } from "./config.js";
import { getMongoClient } from "./lib/mongo-client.js";
import type { Report } from "./types/system-tests.js";

const workerFile: string = fileURLToPath(new URL("./lib/dust-report-worker.js", import.meta.url));

let readyForNewReports: boolean = true;

const getAndRunNewReports = async (): Promise<number | null> => {
  if (!readyForNewReports) {
    logger.warn("indexThreader - Not ready for run - skipping");
    return null;
  }

  readyForNewReports = false;

  try {
    const client: MongoClient = await getMongoClient();
    const db: Db = client.db(MONGODB.DB_NAME);
    const collection: Collection<Report> = db.collection<Report>(MONGODB.REPORT_COLLECTION as string);
    const newReports: WithId<Report>[] = await collection.find({ ready: true }).toArray();

    const updateProps: Partial<Report> = {
      ready: false,
      queued: true,
      running: true,
      startedTimestamp: new Date().toISOString()
    };

    await collection.updateMany({ _id: { $in: newReports.map((doc: WithId<Report>) => doc._id) } }, { $set: updateProps });
    readyForNewReports = true;

    if (newReports.length > 0) {
      logger.info("indexThreader - getAndRunNewReports - Got {NewReportCount} new reports", newReports.length);
    }

    newReports.forEach((report: WithId<Report>) => {
      const merged: WithId<Report> = {
        ...report,
        ...updateProps
      };

      const worker = new Worker(workerFile, { workerData: merged });
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
  } catch (err) {
    logger.errorException(err, "indexThreader - Failed when getting new reports");
    readyForNewReports = true;
    return null;
  } finally {
    await logger.flush();
  }
};

setInterval(getAndRunNewReports, Number(GET_NEW_REPORTS_INTERVAL));
