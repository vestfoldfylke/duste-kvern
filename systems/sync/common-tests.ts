import { prettifyDateToLocaleString } from "../../lib/helpers/date-time-output.js";
import { isWithinTimeRange } from "../../lib/helpers/is-within-timerange.js";
import { success, warn } from "../../lib/test-result.js";
import systemNames from "../system-names.js";

export const syncIdm = {
  id: "sync_idm",
  title: "Har IDM lastRunTime",
  description: "Sjekker siste kjøringstidspunkt for brukersynkronisering",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData.lastIdmRun?.lastRunTime) return warn({ message: "Mangler kjøretidspunkt for brukersynkronisering 😬" });

    const lastRunTimeCheck = isWithinTimeRange(new Date(systemData.lastIdmRun.lastRunTime), new Date(), 24 * 60 * 60);
    const data = {
      lastRunTime: systemData.lastIdmRun.lastRunTime,
      check: lastRunTimeCheck
    };
    if (!lastRunTimeCheck.result) return warn({ message: "Det er mer enn 24 timer siden siste brukersynkronisering", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    return success({ message: `Brukersynkronisering : ${prettifyDateToLocaleString(new Date(systemData.lastIdmRun.lastRunTime))}`, raw: data });
  }
};

export const syncAzure = {
  id: "sync_azure",
  title: "Har azure lastEntraIDSyncTime",
  description: `Sjekker siste synkroniseringstidspunkt for ${systemNames.azure}`,
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData.azureSync?.lastEntraIDSyncTime) return warn({ message: `Mangler synkroniseringstidspunkt for ${systemNames.azure} 😬` });

    const lastRunTimeCheck = isWithinTimeRange(new Date(systemData.azureSync.lastEntraIDSyncTime), new Date(), 40 * 60);
    const data = {
      lastEntraIDSyncTime: systemData.azureSync.lastEntraIDSyncTime,
      check: lastRunTimeCheck
    };
    if (!lastRunTimeCheck.result)
      return warn({ message: `Det er mer enn 40 minutter siden siste synkronisering av ${systemNames.azure}`, raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    return success({ message: `${systemNames.azure} : ${prettifyDateToLocaleString(new Date(systemData.azureSync.lastEntraIDSyncTime))}`, raw: data });
  }
};
