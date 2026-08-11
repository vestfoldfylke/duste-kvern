import { logger } from "@vestfoldfylke/loglady";
import { FINTFOLK } from "../../config.js";
import { CustomError } from "../../lib/CustomError.js";
import { getEntraToken } from "../../lib/get-entra-token.js";
import { HTTPError } from "../../lib/helpers/HTTPError.js";
import type { FintAnsattSystemData } from "../../types/fint-system-data.js";
import type { TestUser } from "../../types/system-tests.js";

export const callFintFolk = async <T>(resource: string, accessBearer: string): Promise<T> => {
  const response: Response = await fetch(`${FINTFOLK.URL}/${resource}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessBearer}`
    }
  });

  if (!response.ok) {
    const errorBody: unknown = await response.json();
    logger.errorException(errorBody, "Failed to fetch {Resource} FINT data. Status: {Status}, StatusText: {StatusText}", resource, response.status, response.statusText);
    throw new HTTPError(response.status, response.statusText, `Failed to fetch ${resource} FINT data. Status: ${response.status}, StatusText: ${response.statusText}. Error: ${errorBody}`);
  }

  return response.json() as T;
};

export const getData = async (user: TestUser): Promise<FintAnsattSystemData | null> => {
  if (!user.onPremisesExtensionAttributes?.extensionAttribute9) {
    logger.warn("User does not have onPremisesExtensionAttributes.extensionAttribute9. Returning null as FintAnsattSystemData for user: {@User}", user);
    return null;
  }

  const bearer: string = await getEntraToken(FINTFOLK.SCOPE as string);

  try {
    const fintEmployee: FintAnsattSystemData = await callFintFolk<FintAnsattSystemData>(`employee/ansattnummer/${user.onPremisesExtensionAttributes.extensionAttribute9}?skipCache=true`, bearer);
    fintEmployee.bostedsadresse = undefined;
    return fintEmployee;
  } catch (err) {
    if (err instanceof HTTPError) {
      if (err.status === 404) {
        logger.errorException(err, "Failed to fetch employee");
        return null;
      }

      if (err.data?.includes("Cannot return null for non-nullable type: 'Personalressurskategori' within parent 'Personalressurs'")) {
        throw new CustomError(err, "Sannsynligvis er det satt sluttdato-FK i HR. Ta kontakt med HR for å få dette rettet.");
      }
    }

    throw err;
  }
};
