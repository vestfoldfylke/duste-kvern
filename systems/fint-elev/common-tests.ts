import { isValidFnr } from "../../lib/helpers/is-valid-fnr.js";
import { pluralizeText } from "../../lib/helpers/pluralize-text.js";
import { error, success, warn } from "../../lib/test-result.js";
import systemNames from "../system-names.js";

export const fintElevforhold = {
  id: "fint_student_elevforhold",
  title: "Har aktiv(e) elevforhold",
  description: "Sjekker om bruker har aktiv(e) elevforhold",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` });
    const aktiveElevforhold = systemData.elevforhold.filter((forhold: any) => forhold.aktiv);
    if (aktiveElevforhold.length > 0) return success({ message: `Har ${aktiveElevforhold.length} ${pluralizeText("aktiv", aktiveElevforhold.length, "e", "t")} elevforhold` });
    const inaktiveElevforhold = systemData.elevforhold.filter((forhold: any) => !forhold.aktiv);
    if (inaktiveElevforhold.length === 0) return warn({ message: "Har ingen elevforhold i det hele tatt", solution: `Rettes i ${systemNames.vis} dersom eleven skal ha elevforhold` });
    const elevforholdInTheFuture = inaktiveElevforhold.find((forhold: any) => new Date() < new Date(forhold.gyldighetsperiode.start));
    if (elevforholdInTheFuture)
      return warn({
        message: `Elevens elevforhold begynner ikke før ${elevforholdInTheFuture.gyldighetsperiode.start.substring(0, 10)}`,
        solution: `Sannsynligvis ikke noe problem, hvert fall ikke hvis det er like før skolestart. Men om det er midt i skoleåret kan det rettes i ${systemNames.vis}`
      });
    return warn({ message: "Utvikler har driti seg ut og mangler en case her...." });
  }
};

export const fintStudentKontaktlarer = {
  id: "fint_student_kontaktlarer",
  title: "Har kontaktlærer",
  description: "Sjekker at elev har kontaktlærer",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` });
    const kontaktlarere = systemData.kontaktlarere;
    if (kontaktlarere.length === 0) return error({ message: "Har ikke kontaktlærer(e) 😬", solution: `Rettes i ${systemNames.vis}` });
    return success({ message: `Har ${kontaktlarere.length} ${pluralizeText("kontaktlærer", kontaktlarere.length, "e")}`, raw: kontaktlarere });
  }
};

export const fintStudentSkoleforhold = {
  id: "fint_student_skoleforhold",
  title: "Har skoleforhold",
  description: "Sjekker at elev har skoleforhold",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` });
    const skoleforhold = systemData.elevforhold.map((forhold: any) => forhold.skole);
    if (skoleforhold.length === 0) {
      return error({ message: "Har ingen skoleforhold 😬", solution: `Rettes i ${systemNames.vis}` });
    }
    const primarySchools = skoleforhold.filter((school: any) => school.hovedskole);
    if (primarySchools.length > 1) {
      return error({ message: `Har ${primarySchools.length} hovedskoler`, raw: primarySchools, solution: `Rettes i ${systemNames.vis}` });
    }
    if (primarySchools.length === 0) {
      return error({ message: "Har ingen hovedskole", raw: skoleforhold, solution: `Rettes i ${systemNames.vis}` });
    }

    const primarySchool = primarySchools[0];
    if (skoleforhold.length > 1) {
      return primarySchool
        ? success({
            message: `Har ${skoleforhold.length} skoleforhold. ${primarySchool.navn} er hovedskole`,
            raw: skoleforhold,
            solution: `Dette er i mange tilfeller korrekt. Dersom det allikevel skulle være feil, må det rettes i ${systemNames.vis}`
          })
        : error({ message: `Har ${skoleforhold.length} skoleforhold men ingen hovedskole`, raw: skoleforhold, solution: `Rettes i ${systemNames.vis}` });
    }

    return success({ message: "Har ett skoleforhold", raw: skoleforhold });
  }
};

export const fintStudentBasisgrupper = {
  id: "fint_student_basisgrupper",
  title: "Har basisgruppe(r)",
  description: "Sjekker at elev har basisgruppe(r)",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` });
    let basisgrupper: any[] = [];
    systemData.elevforhold.forEach((forhold: any) => {
      const bGrupper = forhold.basisgruppemedlemskap.filter((bGruppe: any) => bGruppe.aktiv).map((bGruppe: any) => ({ systemId: bGruppe.systemId, navn: bGruppe.navn, skole: bGruppe.skole.navn }));
      basisgrupper = [...basisgrupper, ...bGrupper];
    });

    if (basisgrupper.length > 0) return success({ message: `Har ${basisgrupper.length} ${pluralizeText("basisgruppe", basisgrupper.length, "r")}`, raw: basisgrupper });
    return error({ message: "Mangler medlemskap i basisgruppe(r) 😬", solution: `Rettes i ${systemNames.vis}` });
  }
};

export const fintStudentUndervisningsgrupper = {
  id: "fint_student_undervisningsgrupper",
  title: "Har undervisningsgruppe(r)",
  description: "Sjekker at elev har undervisningsgruppe(r)",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` });
    let undervisningsgrupper: any[] = [];
    systemData.elevforhold.forEach((forhold: any) => {
      const uGrupper = forhold.undervisningsgruppemedlemskap
        .filter((uGruppe: any) => uGruppe.aktiv || new Date() < new Date(uGruppe.medlemskapgyldighetsperiode.start))
        .map((uGruppe: any) => ({ systemId: uGruppe.systemId, navn: uGruppe.navn, skole: uGruppe.skole.navn }));
      undervisningsgrupper = [...undervisningsgrupper, ...uGrupper];
    });

    if (undervisningsgrupper.length > 0)
      return success({ message: `Har ${undervisningsgrupper.length} ${pluralizeText("undervisningsgruppe", undervisningsgrupper.length, "r")}`, raw: undervisningsgrupper });
    return error({ message: "Mangler medlemskap i undervisningsgruppe(r) 😬", solution: `Rettes i ${systemNames.vis}` });
  }
};

export const fintStudentFaggrupper = {
  id: "fint_student_faggrupper",
  title: "Har faggruppe(r)",
  description: "Sjekker at elev har faggruppe(r)",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` });
    let faggrupper: any[] = [];
    systemData.elevforhold.forEach((forhold: any) => {
      const fGrupper = forhold.faggruppemedlemskap
        .filter((fGruppe: any) => fGruppe.aktiv || new Date() < new Date(fGruppe.medlemskapgyldighetsperiode.start))
        .map((fGruppe: any) => ({ systemId: fGruppe.systemId, navn: fGruppe.navn, fag: fGruppe.fag }));
      faggrupper = [...faggrupper, ...fGrupper];
    });

    if (faggrupper.length > 0) return success({ message: `Har ${faggrupper.length} ${pluralizeText("faggruppe", faggrupper.length, "r")}`, raw: faggrupper });
    return error({ message: "Mangler medlemskap i faggruppe(r) 😬", solution: `Rettes i ${systemNames.vis}` });
  }
};

export const fintStudentProgramomrader = {
  id: "fint_student_programomrader",
  title: "Har programområde(r)",
  description: "Sjekker at elev har programområde(r)",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` });
    let programomrader: any[] = [];
    systemData.elevforhold.forEach((forhold: any) => {
      const pOmrader = forhold.programomrademedlemskap
        .filter((pOmrade: any) => pOmrade.aktiv || new Date() < new Date(pOmrade.medlemskapgyldighetsperiode.start))
        .map((pOmrade: any) => ({ systemId: pOmrade.systemId, navn: pOmrade.navn, utdanningsprogram: pOmrade.utdanningsprogram }));
      programomrader = [...programomrader, ...pOmrader];
    });

    if (programomrader.length > 0) return success({ message: `Har ${programomrader.length} ${pluralizeText("programomrade", programomrader.length, "r")}`, raw: programomrader });
    return error({ message: "Mangler medlemskap i programomrade(r) 😬", solution: `Rettes i ${systemNames.vis}` });
  }
};

export const fintGyldigFodselsnummer = {
  id: "fint_gyldig_fodselsnummer",
  title: "Har gyldig fødselsnummer",
  description: "Sjekker at fødselsnummer er gyldig",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` });
    const data: any = {
      id: systemData.fodselsnummer,
      fnr: isValidFnr(systemData.fodselsnummer)
    };
    return data.fnr.valid ? success({ message: `Har gyldig ${data.fnr.type}`, raw: data }) : error({ message: data.fnr.error, raw: data, solution: `Rettes i ${systemNames.vis}` });
  }
};

export const fintStudentFeidenavn = {
  id: "fint_student_feidenavn",
  title: `Har samme feidenavn i ${systemNames.vis} og ${systemNames.feide}`,
  description: `Sjekker at feidenavn er skrevet tilbake i ${systemNames.vis}`,
  waitForAllData: true,
  test: (user: any, systemData: any, allData: any) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` });
    if (!allData.feide) return error({ message: `Mangler data fra ${systemNames.feide}` });
    if (allData.feide.getDataFailed) return error({ message: `Feilet ved henting av data fra ${systemNames.feide}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.feide}` });

    const data = {
      feide: allData.feide.eduPersonPrincipalName,
      vis: systemData.feidenavn
    };
    if (data.feide && data.vis && data.feide === data.vis) return success({ message: `${systemNames.feide}-navn er skrevet tilbake til ${systemNames.vis}`, raw: data });
    if (data.feide && data.vis && data.feide !== data.vis)
      return error({ message: `${systemNames.feide}-id skrevet tilbake er ikke riktig 😱`, raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    return error({ message: `${systemNames.feide}-id er ikke skrevet tilbake 😬`, raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
  }
};

export const fintStudentUtgattElevforhold = {
  id: "fint_student_utgatt_elevforhold",
  title: "Har utgått elevforhold",
  description: "Sjekker om bruker har utgåtte elevforhold",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (!systemData) return error({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis}` });
    const utgatteElevforhold = systemData.elevforhold.filter((forhold: any) => forhold.gyldighetsperiode.slutt && new Date() > new Date(forhold.gyldighetsperiode.slutt));
    if (utgatteElevforhold.length > 0)
      return warn({
        message: `Har utgått elevforhold ved ${pluralizeText("skole", utgatteElevforhold.length, "r")}: ${utgatteElevforhold.map((forhold: any) => forhold.skole.navn).join(", ")}.`,
        raw: utgatteElevforhold,
        solution: `Dette er i de fleste tilfeller korrekt. Dersom det allikevel skulle være feil, må det rettes i ${systemNames.vis}`
      });
    return success({ message: "Har ingen utgåtte elevforhold" });
  }
};
