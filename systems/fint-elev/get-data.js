const { getEntraToken } = require("../../lib/get-entra-token");
const { FINTFOLK } = require("../../config");
const { callFintFolk } = require("../fint-larer/get-data");

const getData = async (user) => {
  // Hent et token
  const accessToken = await getEntraToken(FINTFOLK.SCOPE);

  try {
    const fintStudent = await callFintFolk(`student/feidenavn/${user.feidenavn}?skipCache=true`, accessToken); // Kan legge til skipCache=true for å alltid hente fra FINT dersom det trengs (gjelder også de andre fint-kallene)
    delete fintStudent.bostedsadresse; // Just in case
    delete fintStudent.hybeladresse; // Just in case

    return fintStudent;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }

    throw error;
  }
};

module.exports = { getData, callFintFolk };
