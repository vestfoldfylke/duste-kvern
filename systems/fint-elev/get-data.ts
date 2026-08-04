import { FINTFOLK } from "../../config.js";
import { getEntraToken } from "../../lib/get-entra-token.js";
import { callFintFolk } from "../fint-larer/get-data.js";

export { callFintFolk };

export const getData = async (user: any): Promise<any> => {
  const bearer = await getEntraToken(FINTFOLK.SCOPE as string);

  try {
    const fintStudent = await callFintFolk(`student/feidenavn/${user.feidenavn}?skipCache=true`, bearer);
    fintStudent.bostedsadresse = undefined;
    fintStudent.hybeladresse = undefined;

    return fintStudent;
  } catch (err: any) {
    if (err.response?.status === 404) {
      return null;
    }

    throw err;
  }
};
