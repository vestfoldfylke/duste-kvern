import { FEIDE } from "../../config.js";
import { isValidFnr } from "../../lib/helpers/is-valid-fnr.js";
import { error, success } from "../../lib/test-result.js";
import systemNames from "../system-names.js";

export const feideAnsatt = {
  id: "feide_ansatt",
  title: `Har ansatt ${systemNames.feide}-bruker`,
  description: `Sjekker om ansatt har ${systemNames.feide}-bruker`,
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData || (Array.isArray(systemData) && systemData.length === 0)) return success({ message: `Ingen ${systemNames.feide}-bruker her`, raw: systemData });

    let feideFnr = typeof systemData.norEduPersonNIN === "string" ? systemData.norEduPersonNIN : null;
    if (!feideFnr) {
      if (Array.isArray(systemData.norEduPersonLIN) && systemData.norEduPersonLIN.length === 1) {
        const feidePrincipalName = FEIDE.PRINCIPAL_NAME.replace("@", "");
        feideFnr = systemData.norEduPersonLIN[0].replace(`${feidePrincipalName}:fin:`, "");
      }
    }
    if (!feideFnr) return error({ message: "Fødselsnummer mangler 😬" });
    const validFnr = isValidFnr(feideFnr);
    if (validFnr.valid) return success({ message: `Ansatt har ${systemNames.feide}-konto og gyldig FNR`, raw: { feideFnr, validFnr } });
    return error({ message: `Ansatt har ${systemNames.feide}-konto, men ikke gyldig fnr i ${systemNames.feide}`, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
  }
};

export const feideElev = {
  id: "feide_elev",
  title: `Har elev ${systemNames.feide}-bruker`,
  description: `Sjekker om elev har ${systemNames.feide}-bruker`,
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData || (Array.isArray(systemData) && systemData.length === 0))
      return error({ message: `Ingen ${systemNames.feide}-bruker her`, raw: systemData, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });

    let feideFnr = typeof systemData.norEduPersonNIN === "string" ? systemData.norEduPersonNIN : null;
    if (!feideFnr) {
      if (Array.isArray(systemData.norEduPersonLIN) && systemData.norEduPersonLIN.length === 1) {
        const feidePrincipalName = FEIDE.PRINCIPAL_NAME.replace("@", "");
        feideFnr = systemData.norEduPersonLIN[0].replace(`${feidePrincipalName}:fin:`, "");
      }
    }
    if (!feideFnr) return error({ message: "Fødselsnummer mangler 😬" });
    const validFnr = isValidFnr(feideFnr);
    if (validFnr.valid) return success({ message: `Elev har ${systemNames.feide}-konto og gyldig FNR`, raw: { feideFnr, validFnr } });
    return error({ message: `Elev har ${systemNames.feide}-konto, men ikke gyldig fnr i ${systemNames.feide}` });
  }
};
