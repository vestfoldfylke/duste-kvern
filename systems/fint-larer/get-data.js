const { getEntraToken } = require("../../lib/get-entra-token");
const { FINTFOLK, FEIDE } = require("../../config");
const { callFintFolk } = require("../fint-ansatt/get-data");

const getData = async (user) => {
  // Hent et token
  const accessToken = await getEntraToken(FINTFOLK.SCOPE);

  try {
    const feidenavn = user.feidenavn || `${user.samAccountName}${FEIDE.PRINCIPAL_NAME}`;
    const fintTeacher = await callFintFolk(`teacher/feidenavn/${feidenavn}?skipCache=true`, accessToken); // Kan legge til skipCache=true for å alltid hente fra FINT dersom det trengs (gjelder også de andre fint-kallene)
    delete fintTeacher.bostedsadresse; // Just in case

    return fintTeacher;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }

    throw error;
  }
};

module.exports = { getData, callFintFolk };
