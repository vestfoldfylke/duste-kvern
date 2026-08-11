import { logger } from "@vestfoldfylke/loglady";
import { FEIDE, FINTFOLK } from "../../config.js";
import { getEntraToken } from "../../lib/get-entra-token.js";
import { HTTPError } from "../../lib/helpers/HTTPError.js";
import type { FintLarerSystemData } from "../../types/fint-system-data.js";
import type { TestUser } from "../../types/system-tests.js";
import { callFintFolk } from "../fint-ansatt/get-data.js";

export const getData = async (user: TestUser): Promise<FintLarerSystemData | null> => {
  const bearer: string = await getEntraToken(FINTFOLK.SCOPE as string);

  try {
    const feidenavn: string = user.feidenavn || `${user.samAccountName}${FEIDE.PRINCIPAL_NAME}`;
    const fintTeacher: FintLarerSystemData = await callFintFolk<FintLarerSystemData>(`teacher/feidenavn/${feidenavn}?skipCache=true`, bearer);
    fintTeacher.bostedsadresse = undefined;

    return fintTeacher;
  } catch (err) {
    if (err instanceof HTTPError && err.status === 404) {
      logger.errorException(err, "Failed to fetch employee");
      return null;
    }

    throw err;
  }
};
