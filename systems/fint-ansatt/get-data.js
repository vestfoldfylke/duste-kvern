const { APPREG, FINTFOLK } = require("../../config");
const { logger } = require("@vestfoldfylke/loglady");
const { CustomError } = require("../../lib/CustomError");
const { getMsalToken } = require("../../lib/get-msal-token");

const callFintFolk = async (resource, accessToken) => {
  const response = await fetch(`${FINTFOLK.URL}/${resource}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    logger.error("Failed to fetch {Resource} FINT data. Status: {Status}, StatusText: {StatusText}. Error: {Error}", resource, response.status, response.statusText, error);
    throw new Error(`Failed to fetch ${resource} FINT data. Status: ${response.status}, StatusText: ${response.statusText}. Error: ${error}`);
  }

  return response.json();
};

const getData = async (user) => {
  // Hent et token
  const clientConfig = {
    clientId: APPREG.CLIENT_ID,
    tenantId: APPREG.TENANT_ID,
    tenantName: APPREG.TENANT_NAME,
    clientSecret: APPREG.CLIENT_SECRET,
    scope: FINTFOLK.SCOPE
  };
  const accessToken = await getMsalToken(clientConfig);

  try {
    const fintEmployee = await callFintFolk(`employee/ansattnummer/${user.onPremisesExtensionAttributes.extensionAttribute9}?skipCache=true`, accessToken); // Kan legge til skipCache=true for å alltid hente fra FINT dersom det trengs (gjelder også de andre fint-kallene)
    delete fintEmployee.bostedsadresse; // Just in case
    return fintEmployee;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    /*
    if (error.response?.data?.data?.includes('Query param ansattnummers')) {
      throw new CustomError(error, 'Loller boller, 2,5 cm er mer enn nok for meg!')
    }
    */
    if (error.response?.data?.data?.includes("Cannot return null for non-nullable type: 'Personalressurskategori' within parent 'Personalressurs'")) {
      throw new CustomError(error, "Sannsynligvis er det satt sluttdato-FK i HR. Ta kontakt med HR for å få dette rettet.");
    }
    throw error;
  }
};

module.exports = { getData, callFintFolk };
