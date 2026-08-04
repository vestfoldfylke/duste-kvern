import { logger } from "@vestfoldfylke/loglady";
import { FINTFOLK } from "../../config.js";
import { CustomError } from "../../lib/CustomError.js";
import { getEntraToken } from "../../lib/get-entra-token.js";

export const callFintFolk = async (resource: string, accessBearer: string): Promise<any> => {
  const response = await fetch(`${FINTFOLK.URL}/${resource}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessBearer}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.json();
    logger.errorException(errorBody, "Failed to fetch {Resource} FINT data. Status: {Status}, StatusText: {StatusText}", resource, response.status, response.statusText);
    throw new Error(`Failed to fetch ${resource} FINT data. Status: ${response.status}, StatusText: ${response.statusText}. Error: ${errorBody}`);
  }

  return response.json();
};

export const getData = async (user: any): Promise<any> => {
  const bearer = await getEntraToken(FINTFOLK.SCOPE as string);

  try {
    const fintEmployee = await callFintFolk(`employee/ansattnummer/${user.onPremisesExtensionAttributes.extensionAttribute9}?skipCache=true`, bearer);
    fintEmployee.bostedsadresse = undefined;
    return fintEmployee;
  } catch (err: any) {
    if (err.response?.status === 404) {
      return null;
    }

    if (err.response?.data?.data?.includes("Cannot return null for non-nullable type: 'Personalressurskategori' within parent 'Personalressurs'")) {
      throw new CustomError(err, "Sannsynligvis er det satt sluttdato-FK i HR. Ta kontakt med HR for å få dette rettet.");
    }

    throw err;
  }
};
