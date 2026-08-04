import { FEIDE, FINTFOLK } from "../../config.js";
import { getEntraToken } from "../../lib/get-entra-token.js";
import { callFintFolk } from "../fint-ansatt/get-data.js";

export { callFintFolk };

export const getData = async (user: any): Promise<any> => {
  const bearer = await getEntraToken(FINTFOLK.SCOPE as string);

  try {
    const feidenavn = user.feidenavn || `${user.samAccountName}${FEIDE.PRINCIPAL_NAME}`;
    const fintTeacher = await callFintFolk(`teacher/feidenavn/${feidenavn}?skipCache=true`, bearer);
    fintTeacher.bostedsadresse = undefined;

    return fintTeacher;
  } catch (err: any) {
    if (err.response?.status === 404) {
      return null;
    }

    throw err;
  }
};
