import { pluralizeText } from "../../lib/helpers/pluralize-text.js";
import { error, ignore, success, warn } from "../../lib/test-result.js";
import systemNames from "../system-names.js";

export const fintData = {
  id: "fint_data",
  title: `Har bruker i ${systemNames.fintLarer}`,
  description: `Sjekker om brukeren har bruker i ${systemNames.fintLarer}`,
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return success({ message: `Har ikke ${systemNames.fintLarer} bruker` });
    return success({ message: `Har bruker i ${systemNames.fintLarer}` });
  }
};

export const fintKontaktlarer = {
  id: "fint_kontaktlarer",
  title: "Er kontaktlærer",
  description: "Sjekker om brukeren er kontaktlærer",
  waitForAllData: false,
  test: (user: any, systemData: any) => {
    if (!systemData && !user.isTeacher) return ignore();
    if (user.isTeacher && !systemData) return error({ message: `Er lærer, men mangler bruker i ${systemNames.fintLarer}` });
    let kontaktlarergrupper: any[] = [];
    systemData.undervisningsforhold.forEach((forhold: any) => {
      const kGrupper = forhold.kontaktlarergrupper.filter((kGruppe: any) => kGruppe.aktiv).map((kGruppe: any) => ({ systemId: kGruppe.systemId, navn: kGruppe.navn, skole: kGruppe.skole.navn }));
      kontaktlarergrupper = [...kontaktlarergrupper, ...kGrupper];
    });
    if (kontaktlarergrupper.length === 0) return success({ message: "Er ikke kontaktlærer for noen klasser" });
    return success({ message: `Er kontaktlærer for ${kontaktlarergrupper.length} ${pluralizeText("klasse", kontaktlarergrupper.length, "r")}`, raw: kontaktlarergrupper });
  }
};

export const fintDuplicateKontaktlarergrupper = {
  id: "fint_duplikate_kontaktlarergrupper",
  title: "Har duplikate kontaktlærergrupper",
  description: "Sjekker om brukeren har duplikate kontaktlærergrupper",
  waitForAllData: false,
  test: (user: any, systemData: any) => {
    if (!systemData && !user.isTeacher) return ignore();
    if (user.isTeacher && !systemData) return error({ message: `Er lærer, men mangler bruker i ${systemNames.fintLarer}` });
    let kontaktlarergrupper: any[] = [];
    systemData.undervisningsforhold.forEach((forhold: any) => {
      const kGrupper = forhold.kontaktlarergrupper.filter((kGruppe: any) => kGruppe.aktiv).map((kGruppe: any) => ({ systemId: kGruppe.systemId, navn: kGruppe.navn, skole: kGruppe.skole.navn }));
      kontaktlarergrupper = [...kontaktlarergrupper, ...kGrupper];
    });
    const duplicates: any[] = [];
    for (const kGruppe of kontaktlarergrupper) {
      kGruppe.checked = true;
      const duplicate = kontaktlarergrupper.find((k) => !k.checked && k.systemId === kGruppe.systemId);
      if (duplicate) {
        duplicates.push(duplicate);
        duplicates.push(kGruppe);
      }
    }

    if (duplicates.length === 0) return success({ message: "Har ikke duplikate kontaktlærergrupper" });
    return warn({
      message: `Har ${duplicates.length} ${pluralizeText("duplikat", duplicates.length, "e")} ${pluralizeText("kontaktlærergruppe", duplicates.length, "r")}`,
      raw: { duplicates },
      solution: `Rettes i ${systemNames.fintLarer}`
    });
  }
};

export const fintSkoleforhold = {
  id: "fint_skoleforhold",
  title: "Har skoleforhold",
  description: "Sjekker om ansatt har skoleforhold",
  waitForAllData: false,
  test: (user: any, systemData: any) => {
    if (!systemData && !user.isTeacher) return ignore();
    if (user.isTeacher && !systemData) return error({ message: `Er lærer, men mangler bruker i ${systemNames.fintLarer}` });
    const skoleforhold = systemData.undervisningsforhold.filter((forhold: any) => forhold.aktiv).map((forhold: any) => forhold.skole);
    if (skoleforhold.length === 0) return error({ message: "Har ingen skoleforhold 😬", solution: `Rettes i ${systemNames.fintLarer}` });
    return success({ message: `Har ${skoleforhold.length} skoleforhold`, raw: skoleforhold });
  }
};

export const fintUndervisningsgrupper = {
  id: "fint_undervisningsgrupper",
  title: "Har undervisningsgruppe(r)",
  description: "Sjekker om ansatt har undervisningsgrupper",
  waitForAllData: false,
  test: (user: any, systemData: any) => {
    if (!systemData && !user.isTeacher) return ignore();
    if (user.isTeacher && !systemData) return error({ message: `Er lærer, men mangler bruker i ${systemNames.fintLarer}` });
    let undervisningsgrupper: any[] = [];
    systemData.undervisningsforhold.forEach((forhold: any) => {
      const uGrupper = forhold.undervisningsgrupper.filter((uGruppe: any) => uGruppe.aktiv).map((uGruppe: any) => ({ systemId: uGruppe.systemId, navn: uGruppe.navn, skole: uGruppe.skole.navn }));
      undervisningsgrupper = [...undervisningsgrupper, ...uGrupper];
    });
    if (undervisningsgrupper.length === 0) return success({ message: "Har ingen undervisningsgrupper", raw: undervisningsgrupper });
    return success({ message: `Underviser i ${undervisningsgrupper.length} ${pluralizeText("undervisningsgruppe", undervisningsgrupper.length, "r")}`, raw: undervisningsgrupper });
  }
};

export const fintFodselsnummer = {
  id: "fint_fodselsnummer",
  title: `Fødselsnummer er likt i ${systemNames.ad}`,
  description: `Sjekker at fødselsnummeret er likt i ${systemNames.ad} og ${systemNames.vis}`,
  waitForAllData: true,
  test: (user: any, systemData: any, allData: any) => {
    if (!systemData && !user.isTeacher) return ignore();
    if (user.isTeacher && !systemData) return error({ message: `Er lærer, men mangler bruker i ${systemNames.fintLarer}` });
    if (!allData.ad) return error({ message: `Mangler data fra ${systemNames.ad}` });
    if (allData.ad.getDataFailed) return error({ message: `Feilet ved henting av data fra ${systemNames.ad}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.ad}` });
    const data = {
      adFnr: allData.ad.employeeNumber,
      visFnr: systemData.fodselsnummer
    };
    if (!data.adFnr) return error({ message: `Mangler fødselsnummer i ${systemNames.ad}`, solution: "Meld sak til arbeidsgruppe IDM i Pureservice", raw: data });
    if (!data.visFnr) return error({ message: `Mangler fødselsnummer i ${systemNames.fintLarer}`, solution: `Rettes i ${systemNames.fintLarer}`, raw: data });
    if (data.adFnr.toString() !== data.visFnr.toString())
      return error({ message: `Fødselsnummer er forskjellig i ${systemNames.ad} og ${systemNames.fintLarer}`, raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    return success({ message: `Fødselsnummer er likt i ${systemNames.ad} og ${systemNames.fintLarer}`, raw: data });
  }
};

export const fintMobilnummer = {
  id: "fint_mobilnummer",
  title: "Har telefonnummer",
  description: `Sjekker at telefonnummer er registrert i ${systemNames.fintLarer}`,
  waitForAllData: false,
  test: (user: any, systemData: any) => {
    if (!systemData && !user.isTeacher) return ignore();
    if (user.isTeacher && !systemData) return error({ message: `Er lærer, men mangler bruker i ${systemNames.fintLarer}` });
    const data = {
      larerMobiltelefonnummer: systemData.larerMobiltelefonnummer,
      kontaktMobiltelefonnummer: systemData.kontaktMobiltelefonnummer
    };
    if (!data.larerMobiltelefonnummer && !data.kontaktMobiltelefonnummer)
      return warn({ message: `Telefonnummer ikke registrert i ${systemNames.fintLarer}`, raw: data, solution: `Rettes i ${systemNames.fintLarer}` });
    return success({ message: "Har registrert telefonnummer", raw: data });
  }
};

export const fintFeideVis = {
  id: "fint_feide_vis",
  title: `Har samme feidenavn i ${systemNames.vis} og ${systemNames.feide}`,
  description: `Sjekker at feidenavn er skrevet tilbake i ${systemNames.vis}`,
  waitForAllData: true,
  test: (user: any, systemData: any, allData: any) => {
    if (!systemData && !user.isTeacher) return ignore();
    if (user.isTeacher && !systemData) return error({ message: `Er lærer, men mangler bruker i ${systemNames.fintLarer}` });
    if (!allData.feide) return error({ message: `Mangler data fra ${systemNames.feide}` });
    if (allData.feide.getDataFailed) return error({ message: `Feilet ved henting av data fra ${systemNames.feide}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.feide}` });
    if (!user.isTeacher && Array.isArray(allData.feide) && allData.feide.length === 0) return success({ message: `Er ikke lærer, og har ikke ${systemNames.feide}-bruker` });
    const data = {
      feide: allData.feide.eduPersonPrincipalName,
      vis: systemData.feidenavn
    };
    if (data.feide && data.vis && data.feide === data.vis) return success({ message: `${systemNames.feide}-navn er skrevet tilbake til ${systemNames.fintLarer}`, raw: data });
    if (data.feide && data.vis && data.feide !== data.vis)
      return error({ message: `${systemNames.feide}-id skrevet tilbake er ikke riktig 😱`, raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    return error({ message: `${systemNames.feide}-id er ikke skrevet tilbake 😬`, raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
  }
};
