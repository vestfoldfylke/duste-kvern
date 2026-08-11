import { prettifyDateToLocaleString } from "../../lib/helpers/date-time-output.js";
import { isWithinTimeRange, type TimeRangeResult } from "../../lib/helpers/is-within-timerange.js";
import { getSystemData } from "../../lib/helpers/system-data.js";
import { success, warn } from "../../lib/test-result.js";
import type { SyncSystemData, SystemData } from "../../types/system-data.js";
import type { TestCase, TestUser } from "../../types/system-tests.js";
import systemNames from "../system-names.js";

/*export const syncIdm: TestCase = {
  id: "sync_idm",
  title: "Har IDM lastRunTime",
  description: "Sjekker siste kjøringstidspunkt for brukersynkronisering",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
  if (!systemData) {
      return warn({message: `Mangler data i ${systemNames.sync}`, solution: "Meld sak til arbeidsgruppe IDM i Pureservice"});
    }

    const syncData: SyncSystemData = getSystemData<SyncSystemData>(systemData);
    if (!syncData.lastIdmRun?.lastRunTime) {
      return warn({message: "Mangler kjøretidspunkt for brukersynkronisering 😬"});
    }

    const lastRunTimeCheck: TimeRangeResult = isWithinTimeRange(new Date(syncData.lastIdmRun.lastRunTime), new Date(), 24 * 60 * 60);
    const data = {
      lastRunTime: syncData.lastIdmRun.lastRunTime,
      check: lastRunTimeCheck
    };

    if (!lastRunTimeCheck.result) {
      return warn({message: "Det er mer enn 24 timer siden siste brukersynkronisering", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice"});
    }

    return success({ message: `Brukersynkronisering : ${prettifyDateToLocaleString(new Date(syncData.lastIdmRun.lastRunTime))}`, raw: data });
  }
};*/

export const syncAzure: TestCase = {
  id: "sync_azure",
  title: "Har azure lastEntraIDSyncTime",
  description: `Sjekker siste synkroniseringstidspunkt for ${systemNames.azure}`,
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return warn({ message: `Mangler data i ${systemNames.sync}`, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    }

    const syncData: SyncSystemData = getSystemData<SyncSystemData>(systemData);
    if (!syncData.azureSync?.lastEntraIDSyncTime) {
      return warn({ message: `Mangler synkroniseringstidspunkt for ${systemNames.azure} 😬` });
    }

    const lastRunTimeCheck: TimeRangeResult = isWithinTimeRange(new Date(syncData.azureSync.lastEntraIDSyncTime), new Date(), 40 * 60);
    const data = {
      lastEntraIDSyncTime: syncData.azureSync.lastEntraIDSyncTime,
      check: lastRunTimeCheck
    };

    if (!lastRunTimeCheck.result) {
      return warn({ message: `Det er mer enn 40 minutter siden siste synkronisering av ${systemNames.azure}`, raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    }

    return success({ message: `${systemNames.azure} : ${prettifyDateToLocaleString(new Date(syncData.azureSync.lastEntraIDSyncTime))}`, raw: data });
  }
};
