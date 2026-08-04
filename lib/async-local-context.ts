import { AsyncLocalStorage } from "node:async_hooks";
import { logger } from "@vestfoldfylke/loglady";

const asyncLocalStorage = new AsyncLocalStorage<Record<string, unknown>>();

export const runInContext = async <T>(logConfig: Record<string, unknown>, callback: () => Promise<T>): Promise<T> => {
  logger.setContextProvider(() => asyncLocalStorage.getStore());
  return asyncLocalStorage.run(logConfig, callback);
};
