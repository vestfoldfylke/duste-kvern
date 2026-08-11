import { logger } from "@vestfoldfylke/loglady";
import { FINTFOLK } from "../../config.js";
import { getEntraToken } from "../../lib/get-entra-token.js";
import { HTTPError } from "../../lib/helpers/HTTPError.js";
import type { FintElevSystemData } from "../../types/fint-system-data.js";
import type { TestUser } from "../../types/system-tests.js";
import { callFintFolk } from "../fint-ansatt/get-data.js";

export const getData = async (user: TestUser): Promise<FintElevSystemData | null> => {
  if (!user.feidenavn) {
    logger.warn("User does not have feidenavn. Returning null as FintElevSystemData for user: {@User}", user);
    return null;
  }

  const bearer: string = await getEntraToken(FINTFOLK.SCOPE as string);

  try {
    const fintStudent: FintElevSystemData = await callFintFolk<FintElevSystemData>(`student/feidenavn/${user.feidenavn}?skipCache=true`, bearer);
    fintStudent.bostedsadresse = undefined;
    fintStudent.hybeladresse = undefined;

    return fintStudent;
  } catch (err) {
    if (err instanceof HTTPError && err.status === 404) {
      logger.errorException(err, "Failed to fetch student");
      return null;
    }

    throw err;
  }
};
