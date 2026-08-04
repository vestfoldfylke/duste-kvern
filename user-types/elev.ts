import { APPREG } from "../config.js";
import { error, success } from "../lib/test-result.js";
import * as azureTests from "../systems/azure/common-tests.js";
import * as feideTests from "../systems/feide/common-tests.js";
import * as visTests from "../systems/fint-elev/common-tests.js";
import * as nettsperreTests from "../systems/nettsperre/common-tests.js";
import * as syncTests from "../systems/sync/common-tests.js";
import systemNames from "../systems/system-names.js";

const { TENANT_NAME } = APPREG;

export const systemsAndTests = [
  {
    id: "azure",
    name: systemNames.azure,
    tests: [
      {
        id: "azure_upn",
        title: "UPN er korrekt",
        description: "Sjekker at UPN er korrekt for bruker",
        waitForAllData: false,
        test: (_user: any, systemData: any) => {
          const data = {
            userPrincipalName: systemData.userPrincipalName
          };
          if (systemData.userPrincipalName.includes(".onmicrosoft.com"))
            return error({ message: "UPN (brukernavn til Microsoft 365) er ikke korrekt 😬", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
          if (!data.userPrincipalName.endsWith(`@skole.${TENANT_NAME}.no`))
            return error({ message: "UPN (brukernavn til Microsoft 365) er ikke korrekt", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
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
    tests: [syncTests.syncAzure]
  },
  {
    id: "feide",
    name: systemNames.feide,
    tests: [feideTests.feideElev]
  },
  {
    id: "nettsperre",
    name: systemNames.nettsperre,
    tests: [nettsperreTests.nettsperreHarNettsperre, nettsperreTests.nettsperrePending, nettsperreTests.nettsperreOverlappende]
  }
];
