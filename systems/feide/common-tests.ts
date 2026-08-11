import { FEIDE } from "../../config.js";
import { isValidFnr, type ValidationResult } from "../../lib/helpers/is-valid-fnr.js";
import { getSystemData } from "../../lib/helpers/system-data.js";
import { error, success } from "../../lib/test-result.js";
import type { FeideSystemData, SystemData } from "../../types/system-data.js";
import type { TestCase, TestUser } from "../../types/system-tests.js";
import systemNames from "../system-names.js";

export const feideAnsatt: TestCase = {
  id: "feide_ansatt",
  title: `Har ansatt ${systemNames.feide}-bruker`,
  description: `Sjekker om ansatt har ${systemNames.feide}-bruker`,
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData || (Array.isArray(systemData) && systemData.length === 0)) {
      return success({ message: `Ingen ${systemNames.feide}-bruker her`, raw: systemData });
    }

    const feideData: FeideSystemData = getSystemData<FeideSystemData>(systemData);
    let feideFnr: string | null = typeof feideData.norEduPersonNIN === "string" ? feideData.norEduPersonNIN : null;
    if (!feideFnr) {
      if (Array.isArray(feideData.norEduPersonLIN) && feideData.norEduPersonLIN.length === 1) {
        const feidePrincipalName: string = FEIDE.PRINCIPAL_NAME.replace("@", "");
        feideFnr = feideData.norEduPersonLIN[0].replace(`${feidePrincipalName}:fin:`, "");
      }
    }

    if (!feideFnr) {
      return error({ message: "Fødselsnummer mangler 😬" });
    }

    const validFnr: ValidationResult = isValidFnr(feideFnr);
    if (validFnr.valid) {
      return success({ message: `Ansatt har ${systemNames.feide}-konto og gyldig FNR`, raw: { feideFnr, validFnr } });
    }

    return error({ message: `Ansatt har ${systemNames.feide}-konto, men ikke gyldig fnr i ${systemNames.feide}`, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
  }
};

export const feideElev: TestCase = {
  id: "feide_elev",
  title: `Har elev ${systemNames.feide}-bruker`,
  description: `Sjekker om elev har ${systemNames.feide}-bruker`,
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData || (Array.isArray(systemData) && systemData.length === 0)) {
      return error({ message: `Ingen ${systemNames.feide}-bruker her`, raw: systemData, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    }

    const feideData: FeideSystemData = getSystemData<FeideSystemData>(systemData);
    let feideFnr: string | null = typeof feideData.norEduPersonNIN === "string" ? feideData.norEduPersonNIN : null;
    if (!feideFnr) {
      if (Array.isArray(feideData.norEduPersonLIN) && feideData.norEduPersonLIN.length === 1) {
        const feidePrincipalName: string = FEIDE.PRINCIPAL_NAME.replace("@", "");
        feideFnr = feideData.norEduPersonLIN[0].replace(`${feidePrincipalName}:fin:`, "");
      }
    }

    if (!feideFnr) {
      return error({ message: "Fødselsnummer mangler 😬" });
    }

    const validFnr: ValidationResult = isValidFnr(feideFnr);
    if (validFnr.valid) {
      return success({ message: `Elev har ${systemNames.feide}-konto og gyldig FNR`, raw: { feideFnr, validFnr } });
    }

    return error({ message: `Elev har ${systemNames.feide}-konto, men ikke gyldig fnr i ${systemNames.feide}` });
  }
};
