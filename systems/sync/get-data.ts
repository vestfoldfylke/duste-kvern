import { logger } from "@vestfoldfylke/loglady";
import { GRAPH } from "../../config.js";
import { getEntraToken } from "../../lib/get-entra-token.js";
import { callGraph } from "../azure/get-data.js";

export const getData = async (_user: unknown): Promise<any> => {
  const bearer = await getEntraToken(GRAPH.SCOPE);

  logger.info("sync-get-data - fetching lastSyncTime");
  const onPremisesLastSyncDateTime = await callGraph("organization?$select=onPremisesLastSyncDateTime", bearer);

  return {
    azureSync: {
      lastEntraIDSyncTime: (onPremisesLastSyncDateTime?.value && onPremisesLastSyncDateTime.value.length > 0 && onPremisesLastSyncDateTime.value[0].onPremisesLastSyncDateTime) || null
    }
  };
};
