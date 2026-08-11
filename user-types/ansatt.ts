import { APPREG } from "../config.js";
import { getSystemData } from "../lib/helpers/system-data.js";
import { error, success, warn } from "../lib/test-result.js";
import * as adTests from "../systems/ad/common-tests.js";
import * as azureTests from "../systems/azure/common-tests.js";
import * as feideTests from "../systems/feide/common-tests.js";
import * as fintAnsattTests from "../systems/fint-ansatt/common-tests.js";
import * as fintLarerTests from "../systems/fint-larer/common-tests.js";
import * as syncTests from "../systems/sync/common-tests.js";
import systemNames from "../systems/system-names.js";
import type { ADSystemData, AzureSystemData, SystemData } from "../types/system-data.js";
import type { SystemWithTestsAndData, TestUser } from "../types/system-tests.js";

const { TENANT_NAME } = APPREG;

export const systemsAndTests: SystemWithTestsAndData[] = [
  {
    id: "ad",
    name: systemNames.ad,
    description: null,
    tests: [
      {
        id: "ad-upn",
        title: "UPN er korrekt",
        description: "Sjekker at UPN er korrekt",
        waitForAllData: false,
        test: (_user: TestUser, systemData: SystemData | undefined) => {
          if (!systemData) {
            return warn({ message: `Mangler data i ${systemNames.ad}`, solution: `Rettes i ${systemNames.vis}` });
          }

          const adData: ADSystemData = getSystemData<ADSystemData>(systemData);
          if (!adData.userPrincipalName) {
            return error({ message: "UPN mangler 😬", raw: systemData });
          }

          const data = {
            userPrincipalName: adData.userPrincipalName
          };

          if (!data.userPrincipalName.endsWith(`@${TENANT_NAME}.no`)) {
            return error({ message: "UPN (brukernavn til Microsoft 365) er ikke korrekt", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
          }

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
    description: null,
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
        test: (_user: TestUser, systemData: SystemData | undefined) => {
          if (!systemData) {
            return warn({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
          }

          const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);
          const data = {
            userPrincipalName: azureData.userPrincipalName
          };

          if (data.userPrincipalName.includes(".onmicrosoft.com")) {
            return error({ message: "UPN (brukernavn til Microsoft 365) er ikke korrekt 😬", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
          }

          if (!data.userPrincipalName.endsWith(`@${TENANT_NAME}.no`)) {
            return error({ message: "UPN (brukernavn til Microsoft 365) er ikke korrekt", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
          }

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
    description: null,
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
    description: null,
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
    description: null,
    tests: [syncTests.syncAzure]
  },
  {
    id: "feide",
    name: systemNames.feide,
    description: null,
    tests: [feideTests.feideAnsatt]
  }
];
