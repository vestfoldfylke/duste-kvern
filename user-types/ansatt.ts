import { APPREG } from "../config.js";
import { error, success } from "../lib/test-result.js";
import * as adTests from "../systems/ad/common-tests.js";
import * as azureTests from "../systems/azure/common-tests.js";
import * as feideTests from "../systems/feide/common-tests.js";
import * as fintAnsattTests from "../systems/fint-ansatt/common-tests.js";
import * as fintLarerTests from "../systems/fint-larer/common-tests.js";
import * as syncTests from "../systems/sync/common-tests.js";
import systemNames from "../systems/system-names.js";

const { TENANT_NAME } = APPREG;

export const systemsAndTests = [
  {
    id: "ad",
    name: systemNames.ad,
    tests: [
      {
        id: "ad-upn",
        title: "UPN er korrekt",
        description: "Sjekker at UPN er korrekt",
        waitForAllData: false,
        test: (_user: any, systemData: any) => {
          if (!systemData.userPrincipalName) return error({ message: "UPN mangler 😬", raw: systemData });
          const data = {
            userPrincipalName: systemData.userPrincipalName
          };
          if (!data.userPrincipalName.endsWith(`@${TENANT_NAME}.no`))
            return error({ message: "UPN (brukernavn til Microsoft 365) er ikke korrekt", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
          return success({ message: "UPN (brukernavn til Microsoft 365) er korrekt for ansatt", raw: data });
        }
      },
      adTests.adAktiveringAnsatt,
      adTests.adHvilkenOU,
      adTests.adLocked,
      adTests.adFnr,
      adTests.adStateLicense,
      adTests.adExt4,
      adTests.adExt9,
      adTests.adGroupMembership
    ]
  },
  {
    id: "azure",
    name: systemNames.azure,
    tests: [
      azureTests.azureLicense,
      azureTests.azureLicenseDowngrade,
      azureTests.azureLicenseManuallyChanged,
      azureTests.azureLicenseA1,
      {
        id: "azure_upn",
        title: "UPN er korrekt",
        description: "Sjekker at UPN er korrekt for ansatt",
        waitForAllData: false,
        test: (_user: any, systemData: any) => {
          const data = {
            userPrincipalName: systemData.userPrincipalName
          };
          if (systemData.userPrincipalName.includes(".onmicrosoft.com"))
            return error({ message: "UPN (brukernavn til Microsoft 365) er ikke korrekt 😬", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
          if (!data.userPrincipalName.endsWith(`@${TENANT_NAME}.no`))
            return error({ message: "UPN (brukernavn til Microsoft 365) er ikke korrekt", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
          return success({ message: "UPN (brukernavn til Microsoft 365) er korrekt for ansatt", raw: data });
        }
      },
      azureTests.azureAktiveringAnsatt,
      azureTests.azureUpnEqualsMail,
      azureTests.azurePwdSync,
      azureTests.azurePwdKluss,
      azureTests.azureMfa,
      azureTests.azureAdInSync,
      azureTests.azureGroups,
      azureTests.azureSDSGroups,
      azureTests.azureConditionalAccessPersonaGroup,
      azureTests.azureRiskyUser,
      azureTests.azureLastSignin,
      azureTests.azureSignInInfo,
      azureTests.azureUserDevices
    ]
  },
  {
    id: "fint-ansatt",
    name: systemNames.fintAnsatt,
    tests: [
      fintAnsattTests.fintAnsattData,
      fintAnsattTests.fintAnsattAktivAnsettelsesperiode,
      fintAnsattTests.fintAnsattKategori,
      fintAnsattTests.fintAnsattHarArbeidsforholdstype,
      fintAnsattTests.fintAnsattFnr,
      fintAnsattTests.fintAnsattOrgTilknytning,
      fintAnsattTests.fintAnsattMobile,
      fintAnsattTests.fintAnsattRopebokstaver,
      fintAnsattTests.fintAnsattArbeidsforhold,
      fintAnsattTests.fintAnsattSlutterBruker
    ]
  },
  {
    id: "fint-larer",
    name: systemNames.fintLarer,
    tests: [
      fintLarerTests.fintData,
      fintLarerTests.fintKontaktlarer,
      fintLarerTests.fintDuplicateKontaktlarergrupper,
      fintLarerTests.fintSkoleforhold,
      fintLarerTests.fintUndervisningsgrupper,
      fintLarerTests.fintFodselsnummer,
      fintLarerTests.fintMobilnummer,
      fintLarerTests.fintFeideVis
    ]
  },
  {
    id: "sync",
    name: systemNames.sync,
    tests: [syncTests.syncAzure]
  },
  {
    id: "feide",
    name: systemNames.feide,
    tests: [feideTests.feideAnsatt]
  }
];
