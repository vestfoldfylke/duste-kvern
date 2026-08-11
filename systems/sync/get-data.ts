import { logger } from "@vestfoldfylke/loglady";
import { GRAPH } from "../../config.js";
import { getEntraToken } from "../../lib/get-entra-token.js";
import type { AzureDataWrapper } from "../../types/azure.js";
import type { SyncSystemData, SyncSystemDataObject } from "../../types/system-data.js";
import type { TestUser } from "../../types/system-tests.js";
import { callGraph } from "../azure/get-data.js";

export const getData = async (_user: TestUser): Promise<SyncSystemData> => {
  // const lastIdmRun = await invokePS('Get-DUSTIDMRun.ps1') // Nej, bas01 er skrudd av

  /* INTE nu lengre
  // Hvis OU er VFYLKE/TFYLKE - hent fra ny tenant, hvis ikke hent fra vtfk
  let clientConfig
  if (user.countyOU === COUNTY_OU) {
    clientConfig = {
      clientId: APPREG.CLIENT_ID,
      tenantId: APPREG.TENANT_ID,
      tenantName: APPREG.TENANT_NAME,
      clientSecret: APPREG.CLIENT_SECRET,
      scope: GRAPH.SCOPE
    }
  } else {
    clientConfig = {
      clientId: APPREG_VTFK.CLIENT_ID,
      tenantId: APPREG_VTFK.TENANT_ID,
      tenantName: APPREG_VTFK.TENANT_NAME,
      clientSecret: APPREG_VTFK.CLIENT_SECRET,
      scope: GRAPH.SCOPE
    }
  }
  */

  const bearer: string = await getEntraToken(GRAPH.SCOPE);

  logger.info("sync-get-data - fetching lastSyncTime");
  const onPremisesLastSyncDateTime: AzureDataWrapper<SyncSystemDataObject[]> = await callGraph<SyncSystemDataObject[]>("organization?$select=onPremisesLastSyncDateTime", bearer);

  return {
    // lastIdmRun,
    // lastSDSSync: lastIdmRun,
    azureSync: {
      lastEntraIDSyncTime: (onPremisesLastSyncDateTime?.value && onPremisesLastSyncDateTime.value.length > 0 && onPremisesLastSyncDateTime.value[0].onPremisesLastSyncDateTime) || null
    }
  };
};
