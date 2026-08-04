import { APPREG, SDWORX } from "../../config.js";
import { prettifyDateToLocaleString } from "../../lib/helpers/date-time-output.js";
import { isValidFnr } from "../../lib/helpers/is-valid-fnr.js";
import isWithinDaterange from "../../lib/helpers/is-within-daterange.js";
import { pluralizeText } from "../../lib/helpers/pluralize-text.js";
import { error, ignore, success, warn } from "../../lib/test-result.js";
import systemNames from "../system-names.js";

const { TENANT_NAME } = APPREG;

export const fintAnsattData = {
  id: "fint_ansatt_bruker_finnes",
  title: `Brukeren finnes i ${systemNames.fintAnsatt}`,
  description: `Sjekker at det ble funnet en bruker i ${systemNames.fintAnsatt}`,
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return error({ message: `Har ikke bruker i ${systemNames.fintAnsatt}`, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    return success({ message: `Har bruker i ${systemNames.fintAnsatt}` });
  }
};

export const fintAnsattAktivAnsettelsesperiode = {
  id: "fint_ansatt_aktiv_ansettelsesperiode",
  title: "Aktiv ansettelsesperiode",
  description: `Sjekker at bruker har en aktiv ansettelsesperiode i ${systemNames.fintAnsatt}`,
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return ignore();
    if (!systemData.ansettelsesperiode)
      return error({ message: `Mangler ansettelsesperiode i ${systemNames.fintAnsatt}`, solution: "Meld sak til arbeidsgruppe IDM i Pureservice", raw: systemData.ansettelsesperiode });
    if (!systemData.ansettelsesperiode.aktiv)
      return warn({
        message: `Bruker har ikke en aktiv ansettelsesperiode i ${systemNames.fintAnsatt}`,
        solution: `Dersom ansettelsesperioden skal være aktiv må det rettes i ${systemNames.fintAnsatt}`,
        raw: systemData.ansettelsesperiode
      });
    return success({ message: `Bruker har aktiv ansettelsesperiode i ${systemNames.fintAnsatt}`, raw: systemData.ansettelsesperiode });
  }
};

export const fintAnsattKategori = {
  id: "fint_ansatt_kategori",
  title: "Personalressurs har korrekt kategori",
  description: "Kontrollerer at personalressurs ikke har en kategori som er unntatt fra å få brukerkonto",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return ignore();
    const category = systemData.personalressurskategori;
    if (!category.kode) return error({ message: "Mangler personalressurskategori", raw: category, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    if (SDWORX.EXCLUDED_CATEGORIES.includes(category.kode.toUpperCase()))
      return error({
        message: `Kategorien på personalressursen (${category.kode}) er ekskludert, som tilsier at det ikke skal opprettes noen brukerkonto`,
        raw: category,
        solution: "Meld sak til arbeidsgruppe IDM i Pureservice"
      });
    return success({ message: `Kategorien på ansettelsesforholdet (${category.kode}) er korrekt`, raw: category });
  }
};

export const fintAnsattHarArbeidsforholdstype = {
  id: "fint_ansatt_arbeidsforholdstype",
  title: "Har arbeidsforholdstype",
  description: "Har arbeidsforholdstype på aktive arbeidsforhold",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return ignore();
    if (!systemData.arbeidsforhold || systemData.arbeidsforhold.length === 0) return ignore();

    const activePositions = systemData.arbeidsforhold.filter((arbeidsforhold: any) => arbeidsforhold.aktiv);
    if (activePositions.length === 0) return ignore();

    const activePositionsWithType = activePositions.filter((arbeidsforhold: any) => arbeidsforhold.arbeidsforholdstype !== null);
    if (activePositions.length === activePositionsWithType.length) {
      return success({
        message: "Alle aktive arbeidsforhold har arbeidsforholdstype",
        raw: activePositionsWithType.map((arbeidsforhold: any) => ({ id: arbeidsforhold.systemId, arbeidsforholdstype: arbeidsforhold.arbeidsforholdstype }))
      });
    }

    const activePositionsWithoutType = activePositions.filter((arbeidsforhold: any) => arbeidsforhold.arbeidsforholdstype === null).map((arbeidsforhold: any) => ({ id: arbeidsforhold.systemId }));
    return error({
      message: `${activePositionsWithoutType.length} ${pluralizeText("aktiv", activePositionsWithoutType.length, "e", "")} arbeidsforhold mangler arbeidsforholdstype`,
      raw: activePositionsWithoutType,
      solution: `Rettes i ${systemNames.fintAnsatt}`
    });
  }
};

export const fintAnsattFnr = {
  id: "fint_ansatt_fnr",
  title: "Personalressurs har gyldig fødselsnummer",
  description: "Kontrollerer at personalressurs har et gyldig fødselsnummer",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return ignore();
    const fnr = systemData.fodselsnummer;
    if (!fnr) return error({ message: "Mangler fødselsnummer...", solution: `Rettes i ${systemNames.fintAnsatt}` });
    const validationResult = isValidFnr(fnr);
    if (!validationResult.valid) return error({ message: validationResult.error, raw: { fnr, validationResult }, solution: `Rettes i ${systemNames.fintAnsatt}` });
    if (validationResult.type !== "Fødselsnummer")
      return warn({ message: `Fødselsnummeret som er registrert er et ${validationResult.type}. Dette kan skape problemer i enkelte systemer`, raw: { fnr, validationResult } });
    return success({ message: `Fødselsnummeret registrert i ${systemNames.fintAnsatt} er gyldig`, raw: { fnr, validationResult } });
  }
};

export const fintAnsattOrgTilknytning = {
  id: "fint_ansatt_orgtilknytning",
  title: "Har organisasjonstilknytning",
  description: "Sjekker at bruker har en organisasjonstilknytning",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return ignore();
    if (!systemData.arbeidsforhold || systemData.arbeidsforhold.length === 0)
      return error({ message: "Mangler organisasjonstilknytning", raw: systemData.arbeidsforhold, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    const missingOrg = systemData.arbeidsforhold.filter((forhold: any) => !forhold.arbeidssted.organisasjonsId);
    if (missingOrg.length > 0)
      return error({
        message: `Mangler organisasjonstilknytning (arbeidssted) i ${missingOrg.length} ${pluralizeText("stilling", missingOrg.length, "er")}. Må rettes i ${systemNames.fintAnsatt}`,
        raw: missingOrg,
        solution: `Rettes i ${systemNames.fintAnsatt}`
      });
    return success({ message: "Har organisasjonstilknytning", raw: systemData.arbeidsforhold.map((forhold: any) => forhold.arbeidssted) });
  }
};

export const fintAnsattMobile = {
  id: "fint_ansatt_mobile",
  title: "Personalressurs har mobiltelefonnummer",
  description: `Sjekker at bruker har mobiltelefonnummer på personalressurs i ${systemNames.fintAnsatt}`,
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return ignore();
    if (!systemData.kontaktMobiltelefonnummer && !systemData.privatMobiltelefonnummer) {
      return warn({
        message: `Bruker har ikke mobiltelefonnummer registrert på personalressurs eller person i ${systemNames.fintAnsatt}, og har ikke mottatt oppstartsmelding på SMS`,
        solution: `Bruker kan sette opp konto på minkonto.${TENANT_NAME}.no/ansatt.`
      });
    }
    return success({ message: `Bruker har ☎️ korrekt satt i ${systemNames.fintAnsatt}` });
  }
};

export const fintAnsattRopebokstaver = {
  id: "fint_ansatt_ropebokstaver",
  title: "Navn har ropebokstaver",
  description: "Sjekker om navnet er skrevet med ropebokstaver",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return ignore();
    const data = {
      fornavn: systemData.fornavn,
      etternavn: systemData.etternavn
    };
    if (!data.fornavn) return error({ message: "Mangler fornavn...", solution: `Be HR legge inn fornavn i ${systemNames.fintAnsatt}`, raw: data });
    if (!data.etternavn) return error({ message: "Mangler etternavn...", solution: `Be HR legge inn etternavn i ${systemNames.fintAnsatt}`, raw: data });
    if (data.fornavn === data.fornavn.toUpperCase() || data.etternavn === data.etternavn.toUpperCase())
      return warn({ message: "NAVN ER SKREVET MED ROPEBOKSTAVER 📣", raw: data, solution: `Rettes i ${systemNames.fintAnsatt}` });
    return success({ message: "Navn er på korrekt format", raw: data });
  }
};

export const fintAnsattArbeidsforhold = {
  id: "fint_ansatt_arbeidsforhold",
  title: "Brukers arbeidsforhold",
  description: `Sjekker brukers arbeidsforhold i ${systemNames.fintAnsatt}`,
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return ignore();
    if (!systemData.arbeidsforhold || systemData.arbeidsforhold.length === 0) return error({ message: "Mangler arbeidsforhold", solution: `Rettes i ${systemNames.fintAnsatt}` });

    const positions = systemData.arbeidsforhold.filter((forhold: any) => forhold.aktiv);
    if (positions.length === 0) return error({ message: "Bruker har ingen aktive arbeidsforhold", raw: systemData.arbeidsforhold, solution: `Rettes i ${systemNames.fintAnsatt}` });

    const primaryPositions = positions.filter((position: any) => position.hovedstilling);
    const secondaryPositions = positions.filter((position: any) => !position.hovedstilling);

    if (primaryPositions.length === 0)
      return warn({
        message: `Bruker har ingen hovedstillinger men ${secondaryPositions.length} ${pluralizeText("sekundærstilling", secondaryPositions.length, "er")}`,
        raw: positions,
        solution: `Rettes i ${systemNames.fintAnsatt}`
      });
    if (primaryPositions.length > 0 && secondaryPositions.length > 0)
      return success({
        message: `Har ${primaryPositions.length} ${pluralizeText("hovedstilling", primaryPositions.length, "er")} og ${secondaryPositions.length} ${pluralizeText("sekundærstilling", secondaryPositions.length, "er")}`,
        raw: positions
      });
    if (primaryPositions.length > 0 && secondaryPositions.length === 0)
      return success({ message: `Har ${primaryPositions.length} ${pluralizeText("hovedstilling", primaryPositions.length, "er")}`, raw: positions });
    return error({ message: "Dette burde ikke ha skjedd men det skjedde allikevel", raw: positions, solution: "Vi legger oss flate og lover å se på rutiner 😝" });
  }
};

export const fintAnsattSlutterBruker = {
  id: "fint_ansatt_slutter_bruker",
  title: "Slutter bruker snart",
  description: "Slutter bruker snart hos oss?",
  waitForAllData: false,
  test: (user: any, systemData: any) => {
    if (!systemData) return ignore();
    const employmentPeriod = systemData.ansettelsesperiode;
    if (user.displayName === "Bjørn Kaarstein")
      return warn({
        message: "Denne brukeren har ikke lov til å slutte, og alle forsøk på oppsigelse vil bli anmeldt 🐻",
        raw: employmentPeriod,
        solution: "Dersom du opplever at brukeren ønsker å si opp, gi han et par pils og si at alle andre arbeidsplasser spiller Erlend Ropstad på høy lyd"
      });
    if (!employmentPeriod.aktiv) return ignore();
    if (!employmentPeriod.slutt) return success({ message: "Brukeren skal være med oss i all overskuelig fremtid 🎺", raw: employmentPeriod });
    const isWithin = isWithinDaterange(null, employmentPeriod.slutt);
    const prettyDate = prettifyDateToLocaleString(new Date(employmentPeriod.slutt), true);
    return isWithin ? warn({ message: `Bruker slutter dessverre hos oss den ${prettyDate} 👋` }) : success({ message: `Bruker sluttet dessverre hos oss den ${prettyDate} 🫡`, raw: employmentPeriod });
  }
};
