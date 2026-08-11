import { APPREG } from "../config.js";
import { getSystemData } from "../lib/helpers/system-data.js";
import { error, success, warn } from "../lib/test-result.js";
import * as azureTests from "../systems/azure/common-tests.js";
import * as feideTests from "../systems/feide/common-tests.js";
import * as visTests from "../systems/fint-elev/common-tests.js";
import * as nettsperreTests from "../systems/nettsperre/common-tests.js";
import * as syncTests from "../systems/sync/common-tests.js";
import systemNames from "../systems/system-names.js";
import type { AzureSystemData, SystemData } from "../types/system-data.js";
import type { SystemWithTestsAndData, TestUser } from "../types/system-tests.js";

const { TENANT_NAME } = APPREG;

export const systemsAndTests: SystemWithTestsAndData[] = [
  {
    id: "azure",
    name: systemNames.azure,
    description: null,
    tests: [
      {
        id: "azure_upn",
        title: "UPN er korrekt",
        description: "Sjekker at UPN er korrekt for bruker",
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

          if (!data.userPrincipalName.endsWith(`@skole.${TENANT_NAME}.no`)) {
            return error({ message: "UPN (brukernavn til Microsoft 365) er ikke korrekt", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
          }

          return success({ message: "UPN (brukernavn til Microsoft 365) er korrekt", raw: data });
        }
      },
      azureTests.azureAktiveringElev,
      azureTests.azureUpnEqualsMail,
      azureTests.azureLicense,
      azureTests.azurePwdKluss,
      azureTests.azureProxyAddresses,
      azureTests.azureMfa,
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
    id: "fint-elev",
    name: systemNames.vis,
    description: null,
    tests: [
      visTests.fintElevforhold,
      visTests.fintStudentFeidenavn,
      visTests.fintGyldigFodselsnummer,
      visTests.fintStudentSkoleforhold,
      visTests.fintStudentProgramomrader,
      visTests.fintStudentBasisgrupper,
      visTests.fintStudentUndervisningsgrupper,
      visTests.fintStudentFaggrupper,
      visTests.fintStudentKontaktlarer,
      visTests.fintStudentUtgattElevforhold
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
    tests: [feideTests.feideElev]
  },
  {
    id: "nettsperre",
    name: systemNames.nettsperre,
    description: null,
    tests: [nettsperreTests.nettsperreHarNettsperre, nettsperreTests.nettsperrePending, nettsperreTests.nettsperreOverlappende]
  }
];
