import { isValidFnr } from "../../lib/helpers/is-valid-fnr.js";
import { pluralizeText } from "../../lib/helpers/pluralize-text.js";
import { getSystemData } from "../../lib/helpers/system-data.js";
import { error, isFailedSystemData, success, warn } from "../../lib/test-result.js";
import type { FintAnsattSystemData, FintArbeidsforhold } from "../../types/fint-system-data.js";
import type { ADSystemData, AllSystemData, SystemData } from "../../types/system-data.js";
import type { TestCase, TestUser } from "../../types/system-tests.js";
import systemNames from "../system-names.js";

export const adAktiveringAnsatt: TestCase = {
  id: "ad-aktivering-ansatt",
  title: "Kontoen er aktivert",
  description: `Sjekker at ansatt-kontoen er aktivert i ${systemNames.ad}`,
  waitForAllData: true,
  test: (user: TestUser, systemData: SystemData | undefined, allData: AllSystemData) => {
    if (!allData["fint-ansatt"]) {
      return error({ message: `Mangler data i ${systemNames.fintAnsatt}`, raw: { user }, solution: `Rettes i ${systemNames.fintAnsatt}` });
    }

    if (isFailedSystemData(allData["fint-ansatt"])) {
      return error({ message: `Feilet ved henting av data fra ${systemNames.fintAnsatt}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.fintAnsatt}` });
    }

    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.ad}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const adData: ADSystemData = getSystemData<ADSystemData>(systemData);
    const fintAnsattData = allData["fint-ansatt"] as FintAnsattSystemData;
    const data = {
      enabledInAD: adData.enabled,
      enabledInSdWorx: fintAnsattData.arbeidsforhold.some((forhold: FintArbeidsforhold) => forhold.aktiv || new Date() < new Date(forhold.gyldighetsperiode.start ?? ""))
    };

    if (data.enabledInAD && data.enabledInSdWorx) {
      return success({ message: "Kontoen er aktivert", raw: data });
    }

    if (data.enabledInAD && !data.enabledInSdWorx) {
      return error({ message: "Kontoen er aktivert selv om ansatt ikke har aktivt ansettelsesforhold", raw: data, solution: `Rettes i ${systemNames.fintAnsatt}` });
    }

    if (!data.enabledInAD && data.enabledInSdWorx) {
      return warn({ message: "Kontoen er deaktivert selv om ansatt har et aktivt ansettelsesforhold", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    }

    return warn({ message: `Kontoen er deaktivert i ${systemNames.ad} og ansatt har ikke et aktivt ansettelsesforhold`, raw: data, solution: `Rettes i ${systemNames.fintAnsatt}` });
  }
};

export const adHvilkenOU: TestCase = {
  id: "ad-hvilken-ou",
  title: "Hvilken OU",
  description: "Sjekker at bruker ligger i rett OU",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.ad}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const adData: ADSystemData = getSystemData<ADSystemData>(systemData);
    const data = {
      distinguishedName: adData.distinguishedName
    };

    if (!data.distinguishedName) {
      return error({ message: `Bruker ikke funnet i ${systemNames.ad} 😬`, raw: data, solution: `Rettes i ${systemNames.ad}` });
    }

    if (data.distinguishedName.toUpperCase().includes("OU=AUTO DISABLED USERS")) {
      return warn({ message: "Bruker ligger i OU'en AUTO DISABLED USERS", raw: data, solution: `Rettes i ${systemNames.fintAnsatt}` });
    }

    return success({ message: `Bruker ligger plassert riktig i ${systemNames.ad}`, raw: data });
  }
};

export const adLocked: TestCase = {
  id: "ad-locked",
  title: "Kontoen er ulåst",
  description: `Sjekker at kontoen ikke er sperret for pålogging i ${systemNames.ad}`,
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.ad}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const adData: ADSystemData = getSystemData<ADSystemData>(systemData);
    const data = {
      lockedOut: adData.lockedOut
    };

    if (!data.lockedOut) {
      return success({ message: "Kontoen er åpen for pålogging", raw: data });
    }

    return error({
      message: "Kontoen er sperret for pålogging",
      raw: data,
      solution: `Servicedesk må åpne brukerkontoen for pålogging i ${systemNames.ad}. Dette gjøres i Properties på brukerobjektet under fanen Account`
    });
  }
};

export const adFnr: TestCase = {
  id: "ad-fnr",
  title: "Har gyldig fødselsnummer",
  description: "Sjekker at fødselsnummer er gyldig",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.ad}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const adData: ADSystemData = getSystemData<ADSystemData>(systemData);

    if (!adData.employeeNumber) {
      return error({ message: "Fødselsnummer mangler 😬", raw: systemData });
    }

    const data = {
      employeeNumber: adData.employeeNumber,
      fnr: isValidFnr(adData.employeeNumber)
    };

    return data.fnr.valid
      ? success({ message: `Har gyldig ${data.fnr.type}`, raw: data })
      : error({ message: data.fnr.error ?? "Fnr er ikke gyldig, og error ble ikke returnert fra validatoren", raw: data, solution: `Rettes i ${systemNames.fintAnsatt}` });
  }
};

export const adStateLicense: TestCase = {
  id: "ad-state",
  title: "Har state satt for bruker",
  description: "Sjekker at state er satt på bruker",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.ad}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const adData: ADSystemData = getSystemData<ADSystemData>(systemData);

    if (adData.state && adData.state.length > 0) {
      return success({ message: "Felt for kortkode som styrer lisens er fylt ut", raw: { state: adData.state } });
    }

    return error({ message: "Felt for kortkode som styrer lisens mangler 😬", raw: systemData, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
  }
};

export const adExt4: TestCase = {
  id: "ad-ext4",
  title: "Har extensionAttribute4",
  description: "Sjekker om bruker har extensionAttribute4 (ekstra personalrom/mailinglister)",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.ad}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const adData: ADSystemData = getSystemData<ADSystemData>(systemData);

    if (!adData.extensionAttribute4) {
      return success({ message: "Er ikke medlem av ekstra personalrom- og mailinglister" });
    }

    const data = {
      extensionAttribute4: adData.extensionAttribute4.split(",").map((ext: string) => ext.trim())
    };

    return warn({
      message: `Er medlem av ${data.extensionAttribute4.length} personalrom- og ${pluralizeText("mailingliste", data.extensionAttribute4.length, "r")} ekstra`,
      solution: `extensionAttribute4 fører til medlemskap i personalrom- og mailinglister. Dersom dette ikke er ønskelig fjernes dette fra brukeren i ${systemNames.ad}`,
      raw: data
    });
  }
};

export const adExt9: TestCase = {
  id: "ad-ext9",
  title: "Har extensionAttribute9",
  description: "Sjekker om bruker har extensionAttribute9 (ansattnummer)",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.ad}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const adData: ADSystemData = getSystemData<ADSystemData>(systemData);

    if (!adData.extensionAttribute9) {
      return error({ message: "Ansattnummer mangler i extensionAttribute9 😬", raw: systemData, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    }

    return success({ message: "Har ansattnummer i extensionAttribute9" });
  }
};

export const adGroupMembership: TestCase = {
  id: "ad-group-membership",
  title: "Sjekker direktemedlemskap",
  description: "Sjekker brukers direkte gruppemedlemskap",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.ad}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const adData: ADSystemData = getSystemData<ADSystemData>(systemData);

    if (!adData.memberOf || !Array.isArray(adData.memberOf)) {
      return error({ message: `Er ikke medlem av noen ${systemNames.ad}-grupper 🤔` });
    }

    const groups: string[] = adData.memberOf.map((member: string) => member.replace("CN=", "").split(",")[0]).sort();

    return success({ message: `Er direkte medlem av ${groups.length} ${systemNames.ad}-${pluralizeText("gruppe", groups.length, "r")}`, raw: groups });
  }
};
