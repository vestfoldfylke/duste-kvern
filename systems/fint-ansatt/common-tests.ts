import { APPREG, SDWORX } from "../../config.js";
import { prettifyDateToLocaleString } from "../../lib/helpers/date-time-output.js";
import { isValidFnr, type ValidationResult } from "../../lib/helpers/is-valid-fnr.js";
import isWithinDateRange from "../../lib/helpers/is-within-date-range.js";
import { pluralizeText } from "../../lib/helpers/pluralize-text.js";
import { getSystemData } from "../../lib/helpers/system-data.js";
import { error, ignore, success, warn } from "../../lib/test-result.js";
import type { FintAnsattSystemData, FintArbeidsforhold, FintKodeRelasjon, FintPeriode } from "../../types/fint-system-data.js";
import type { SystemData } from "../../types/system-data.js";
import type { TestCase, TestUser } from "../../types/system-tests.js";
import systemNames from "../system-names.js";

const { TENANT_NAME } = APPREG;

export const fintAnsattData: TestCase = {
  id: "fint_ansatt_bruker_finnes",
  title: `Brukeren finnes i ${systemNames.fintAnsatt}`,
  description: `Sjekker at det ble funnet en bruker i ${systemNames.fintAnsatt}`,
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Har ikke bruker i ${systemNames.fintAnsatt}`, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    }

    return success({ message: `Har bruker i ${systemNames.fintAnsatt}` });
  }
};

export const fintAnsattAktivAnsettelsesperiode: TestCase = {
  id: "fint_ansatt_aktiv_ansettelsesperiode",
  title: "Aktiv ansettelsesperiode",
  description: `Sjekker at bruker har en aktiv ansettelsesperiode i ${systemNames.fintAnsatt}`,
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return ignore();
    }

    const fintData: FintAnsattSystemData = getSystemData<FintAnsattSystemData>(systemData);

    if (!fintData.ansettelsesperiode) {
      return error({ message: `Mangler ansettelsesperiode i ${systemNames.fintAnsatt}`, solution: "Meld sak til arbeidsgruppe IDM i Pureservice", raw: fintData.ansettelsesperiode });
    }

    if (!fintData.ansettelsesperiode.aktiv) {
      return warn({
        message: `Bruker har ikke en aktiv ansettelsesperiode i ${systemNames.fintAnsatt}`,
        solution: `Dersom ansettelsesperioden skal være aktiv må det rettes i ${systemNames.fintAnsatt}`,
        raw: fintData.ansettelsesperiode
      });
    }

    return success({ message: `Bruker har aktiv ansettelsesperiode i ${systemNames.fintAnsatt}`, raw: fintData.ansettelsesperiode });
  }
};

export const fintAnsattKategori: TestCase = {
  id: "fint_ansatt_kategori",
  title: "Personalressurs har korrekt kategori",
  description: "Kontrollerer at personalressurs ikke har en kategori som er unntatt fra å få brukerkonto",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return ignore();
    }

    const fintData: FintAnsattSystemData = getSystemData<FintAnsattSystemData>(systemData);
    const category: FintKodeRelasjon = fintData.personalressurskategori;

    if (!category.kode) {
      return error({ message: "Mangler personalressurskategori", raw: category, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    }

    if (SDWORX.EXCLUDED_CATEGORIES.includes(category.kode.toUpperCase())) {
      return error({
        message: `Kategorien på personalressursen (${category.kode}) er ekskludert, som tilsier at det ikke skal opprettes noen brukerkonto`,
        raw: category,
        solution: "Rettes i HR"
      });
    }

    return success({ message: `Kategorien på ansettelsesforholdet (${category.kode}) er korrekt`, raw: category });
  }
};

export const fintAnsattHarArbeidsforholdstype: TestCase = {
  id: "fint_ansatt_arbeidsforholdstype",
  title: "Har arbeidsforholdstype",
  description: "Har arbeidsforholdstype på aktive arbeidsforhold",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return ignore();
    }

    const fintData: FintAnsattSystemData = getSystemData<FintAnsattSystemData>(systemData);

    if (!fintData.arbeidsforhold || fintData.arbeidsforhold.length === 0) {
      return ignore();
    }

    const activePositions: FintArbeidsforhold[] = fintData.arbeidsforhold.filter((arbeidsforhold: FintArbeidsforhold) => arbeidsforhold.aktiv);
    if (activePositions.length === 0) {
      return ignore();
    }

    const activePositionsWithType: FintArbeidsforhold[] = activePositions.filter((arbeidsforhold: FintArbeidsforhold) => arbeidsforhold.arbeidsforholdstype !== null);
    if (activePositions.length === activePositionsWithType.length) {
      return success({
        message: "Alle aktive arbeidsforhold har arbeidsforholdstype",
        raw: activePositionsWithType.map((arbeidsforhold: FintArbeidsforhold) => ({ id: arbeidsforhold.systemId, arbeidsforholdstype: arbeidsforhold.arbeidsforholdstype }))
      });
    }

    const activePositionsWithoutType: { id: string }[] = activePositions
      .filter((arbeidsforhold: FintArbeidsforhold) => arbeidsforhold.arbeidsforholdstype === null)
      .map((arbeidsforhold: FintArbeidsforhold) => ({ id: arbeidsforhold.systemId }));
    return error({
      message: `${activePositionsWithoutType.length} ${pluralizeText("aktiv", activePositionsWithoutType.length, "e", "")} arbeidsforhold mangler arbeidsforholdstype`,
      raw: activePositionsWithoutType,
      solution: `Rettes i ${systemNames.fintAnsatt}`
    });
  }
};

export const fintAnsattFnr: TestCase = {
  id: "fint_ansatt_fnr",
  title: "Personalressurs har gyldig fødselsnummer",
  description: "Kontrollerer at personalressurs har et gyldig fødselsnummer",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return ignore();
    }

    const fintData: FintAnsattSystemData = getSystemData<FintAnsattSystemData>(systemData);
    const fnr: string = fintData.fodselsnummer;
    if (!fnr) {
      return error({ message: "Mangler fødselsnummer...", solution: `Rettes i ${systemNames.fintAnsatt}` });
    }

    const validationResult: ValidationResult = isValidFnr(fnr);
    if (!validationResult.valid) {
      return error({
        message: validationResult.error ?? "Fnr er ikke gyldig, og error ble ikke returnert fra validatoren",
        raw: { fnr, validationResult },
        solution: `Rettes i ${systemNames.fintAnsatt}`
      });
    }

    if (validationResult.type !== "Fødselsnummer") {
      return warn({ message: `Fødselsnummeret som er registrert er et ${validationResult.type}. Dette kan skape problemer i enkelte systemer`, raw: { fnr, validationResult } });
    }

    return success({ message: `Fødselsnummeret registrert i ${systemNames.fintAnsatt} er gyldig`, raw: { fnr, validationResult } });
  }
};

export const fintAnsattOrgTilknytning: TestCase = {
  id: "fint_ansatt_orgtilknytning",
  title: "Har organisasjonstilknytning",
  description: "Sjekker at bruker har en organisasjonstilknytning",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return ignore();
    }

    const fintData: FintAnsattSystemData = getSystemData<FintAnsattSystemData>(systemData);

    if (!fintData.arbeidsforhold || fintData.arbeidsforhold.length === 0) {
      return error({ message: "Mangler organisasjonstilknytning", raw: fintData.arbeidsforhold, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    }

    const missingOrg: FintArbeidsforhold[] = fintData.arbeidsforhold.filter((forhold: FintArbeidsforhold) => !forhold.arbeidssted.organisasjonsId);
    if (missingOrg.length > 0) {
      return error({
        message: `Mangler organisasjonstilknytning (arbeidssted) i ${missingOrg.length} ${pluralizeText("stilling", missingOrg.length, "er")}. Må rettes i ${systemNames.fintAnsatt}`,
        raw: missingOrg,
        solution: `Rettes i ${systemNames.fintAnsatt}`
      });
    }

    return success({ message: "Har organisasjonstilknytning", raw: fintData.arbeidsforhold.map((forhold: FintArbeidsforhold) => forhold.arbeidssted) });
  }
};

export const fintAnsattMobile: TestCase = {
  id: "fint_ansatt_mobile",
  title: "Personalressurs har mobiltelefonnummer",
  description: `Sjekker at bruker har mobiltelefonnummer på personalressurs i ${systemNames.fintAnsatt}`,
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return ignore();
    }

    const fintData: FintAnsattSystemData = getSystemData<FintAnsattSystemData>(systemData);

    if (!fintData.kontaktMobiltelefonnummer && !fintData.privatMobiltelefonnummer) {
      return warn({
        message: `Bruker har ikke mobiltelefonnummer registrert på personalressurs eller person i ${systemNames.fintAnsatt}, og har ikke mottatt oppstartsmelding på SMS`,
        solution: `Bruker kan sette opp konto på minkonto.${TENANT_NAME}.no/ansatt.`
      });
    }

    return success({ message: `Bruker har ☎️ korrekt satt i ${systemNames.fintAnsatt}` });
  }
};

export const fintAnsattRopebokstaver: TestCase = {
  id: "fint_ansatt_ropebokstaver",
  title: "Navn har ropebokstaver",
  description: "Sjekker om navnet er skrevet med ropebokstaver",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return ignore();
    }

    const fintData: FintAnsattSystemData = getSystemData<FintAnsattSystemData>(systemData);
    const data = {
      fornavn: fintData.fornavn,
      etternavn: fintData.etternavn
    };

    if (!data.fornavn) {
      return error({ message: "Mangler fornavn...", solution: `Be HR legge inn fornavn i ${systemNames.fintAnsatt}`, raw: data });
    }

    if (!data.etternavn) {
      return error({ message: "Mangler etternavn...", solution: `Be HR legge inn etternavn i ${systemNames.fintAnsatt}`, raw: data });
    }

    if (data.fornavn === data.fornavn.toUpperCase() || data.etternavn === data.etternavn.toUpperCase()) {
      return warn({ message: "NAVN ER SKREVET MED ROPEBOKSTAVER 📣", raw: data, solution: `Rettes i ${systemNames.fintAnsatt}` });
    }

    return success({ message: "Navn er på korrekt format", raw: data });
  }
};

export const fintAnsattArbeidsforhold: TestCase = {
  id: "fint_ansatt_arbeidsforhold",
  title: "Brukers arbeidsforhold",
  description: `Sjekker brukers arbeidsforhold i ${systemNames.fintAnsatt}`,
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return ignore();
    }

    const fintData: FintAnsattSystemData = getSystemData<FintAnsattSystemData>(systemData);

    if (!fintData.arbeidsforhold || fintData.arbeidsforhold.length === 0) {
      return error({ message: "Mangler arbeidsforhold", solution: `Rettes i ${systemNames.fintAnsatt}` });
    }

    const positions: FintArbeidsforhold[] = fintData.arbeidsforhold.filter((forhold: FintArbeidsforhold) => forhold.aktiv);
    if (positions.length === 0) {
      return error({ message: "Bruker har ingen aktive arbeidsforhold", raw: fintData.arbeidsforhold, solution: `Rettes i ${systemNames.fintAnsatt}` });
    }

    const primaryPositions: FintArbeidsforhold[] = positions.filter((position: FintArbeidsforhold) => position.hovedstilling);
    const secondaryPositions: FintArbeidsforhold[] = positions.filter((position: FintArbeidsforhold) => !position.hovedstilling);

    if (primaryPositions.length === 0) {
      return warn({
        message: `Bruker har ingen hovedstillinger men ${secondaryPositions.length} ${pluralizeText("sekundærstilling", secondaryPositions.length, "er")}`,
        raw: positions,
        solution: `Rettes i ${systemNames.fintAnsatt}`
      });
    }

    if (primaryPositions.length > 0 && secondaryPositions.length > 0) {
      return success({
        message: `Har ${primaryPositions.length} ${pluralizeText("hovedstilling", primaryPositions.length, "er")} og ${secondaryPositions.length} ${pluralizeText("sekundærstilling", secondaryPositions.length, "er")}`,
        raw: positions
      });
    }

    if (primaryPositions.length > 0 && secondaryPositions.length === 0) {
      return success({ message: `Har ${primaryPositions.length} ${pluralizeText("hovedstilling", primaryPositions.length, "er")}`, raw: positions });
    }

    return error({ message: "Dette burde ikke ha skjedd men det skjedde allikevel", raw: positions, solution: "Vi legger oss flate og lover å se på rutiner 😝" });
  }
};

export const fintAnsattSlutterBruker: TestCase = {
  id: "fint_ansatt_slutter_bruker",
  title: "Slutter bruker snart",
  description: "Slutter bruker snart hos oss?",
  waitForAllData: false,
  test: (user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return ignore();
    }

    const fintData: FintAnsattSystemData = getSystemData<FintAnsattSystemData>(systemData);
    const employmentPeriod: FintPeriode = fintData.ansettelsesperiode;

    if (user.displayName === "Bjørn Kaarstein") {
      return warn({
        message: "Denne brukeren har ikke lov til å slutte, og alle forsøk på oppsigelse vil bli anmeldt 🐻",
        raw: employmentPeriod,
        solution: "Dersom du opplever at brukeren ønsker å si opp, gi han et par pils og si at alle andre arbeidsplasser spiller Erlend Ropstad på høy lyd"
      });
    }

    if (!employmentPeriod.aktiv) {
      return ignore();
    }

    if (!employmentPeriod.slutt) {
      return success({ message: "Brukeren skal være med oss i all overskuelig fremtid 🎺", raw: employmentPeriod });
    }

    const isWithin: boolean = isWithinDateRange(null, employmentPeriod.slutt);
    const prettyDate: string = prettifyDateToLocaleString(new Date(employmentPeriod.slutt), true);
    return isWithin ? warn({ message: `Bruker slutter dessverre hos oss den ${prettyDate} 👋` }) : success({ message: `Bruker sluttet dessverre hos oss den ${prettyDate} 🫡`, raw: employmentPeriod });
  }
};
