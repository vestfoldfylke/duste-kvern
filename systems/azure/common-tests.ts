import { isVestfold } from "../../lib/helpers/county.js";
import { isWithinTimeRange, type TimeRangeResult } from "../../lib/helpers/is-within-timerange.js";
import { pluralizeText } from "../../lib/helpers/pluralize-text.js";
import { getSystemData } from "../../lib/helpers/system-data.js";
import { error, ignore, isFailedSystemData, success, warn } from "../../lib/test-result.js";
import type { License } from "../../types/azure.js";
import type { FintAnsattSystemData, FintArbeidsforhold, FintElevforhold, FintElevSystemData } from "../../types/fint-system-data.js";
import type { ADSystemData, AllSystemData, AzureLicense, AzureRiskyUserSystemDataObject, AzureSystemData, AzureUserSignInSystemDataObject, SystemData } from "../../types/system-data.js";
import type { TestCase, TestUser } from "../../types/system-tests.js";
import systemNames from "../system-names.js";
import licenses from "./licenses.js";

type RawAdInSyncData = {
  azure: {
    accountEnabled: boolean;
    onPremisesLastSyncDateTime: string | null;
  };
  ad: {
    enabled: boolean;
    whenChanged: string;
  };
  isInsideSyncWindow: TimeRangeResult | null;
};

type RawLicenseData = {
  licenses: License[];
  hasNecessaryLicenses: boolean;
};

const aadSyncInMinutes: number = 30;
const aadSyncInSeconds: number = aadSyncInMinutes * 60;

const a1LicenseTitles: string[] = ["Eksamensvakt", "Sensor", "Prøve-/oppgavenemnd"];

const groupWarningLimit: number = 200;

const generateRawLicenseData = (systemData: AzureSystemData): RawLicenseData => {
  const data: RawLicenseData = {
    licenses: [],
    hasNecessaryLicenses: false
  };

  data.licenses = systemData.assignedLicenses.map((license: AzureLicense): License => {
    const lic: License | undefined = licenses.find((l: License) => l.skuId === license.skuId);
    if (lic) {
      data.hasNecessaryLicenses = data.hasNecessaryLicenses ? true : Boolean(lic.skuPartNumber !== "FLOW_FREE");
      return lic;
    }

    return license as License;
  });

  return data;
};

export const azureAktiveringAnsatt: TestCase = {
  id: "azure_aktivering_ansatt",
  title: "Kontoen er aktivert",
  description: `Sjekker at ansatt-kontoen er aktivert i ${systemNames.azure}`,
  waitForAllData: true,
  test: (user: TestUser, systemData: SystemData | undefined, allData: AllSystemData) => {
    if (!allData["fint-ansatt"]) {
      return error({ message: `Mangler data i ${systemNames.fintAnsatt}`, raw: { user }, solution: `Rettes i ${systemNames.fintAnsatt}` });
    }

    if (isFailedSystemData(allData["fint-ansatt"])) {
      return error({ message: `Feilet ved henting av data fra ${systemNames.fintAnsatt}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.fintAnsatt}` });
    }

    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);
    const fintAnsattData: FintAnsattSystemData = getSystemData<FintAnsattSystemData>(allData["fint-ansatt"]);
    const data = {
      enabledInAd: azureData.accountEnabled,
      enabledInSdWorx: fintAnsattData.arbeidsforhold.some((forhold: FintArbeidsforhold) => forhold.aktiv || new Date() < new Date(forhold.gyldighetsperiode.start ?? ""))
    };

    if (data.enabledInAd && data.enabledInSdWorx) {
      return success({ message: "Kontoen er aktivert", raw: data });
    }
    if (data.enabledInAd && !data.enabledInSdWorx) {
      return error({ message: "Kontoen er aktivert selv om ansatt ikke har aktivt ansettelsesforhold", raw: data, solution: `Rettes i ${systemNames.fintAnsatt}` });
    }
    if (!data.enabledInAd && data.enabledInSdWorx) {
      return warn({ message: "Kontoen er deaktivert selv om ansatt har et aktivt ansettelsesforhold", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    }

    return warn({ message: `Kontoen er deaktivert i ${systemNames.azure} og ansatt har ikke et aktivt ansettelsesforhold`, raw: data, solution: `Rettes i ${systemNames.fintAnsatt}` });
  }
};

export const azureAktiveringElev: TestCase = {
  id: "azure_aktivering_elev",
  title: "Kontoen er aktivert",
  description: `Sjekker at elev-kontoen er aktivert i ${systemNames.azure}`,
  waitForAllData: true,
  test: (user: TestUser, systemData: SystemData | undefined, allData: AllSystemData) => {
    if (!allData["fint-elev"]) {
      return error({ message: `Mangler data i ${systemNames.vis}`, raw: { user }, solution: `Rettes i ${systemNames.vis}` });
    }

    if (isFailedSystemData(allData["fint-elev"])) {
      return error({ message: `Feilet ved henting av data fra ${systemNames.vis}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.vis}` });
    }

    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);
    const fintElevData: FintElevSystemData = getSystemData<FintElevSystemData>(allData["fint-elev"]);
    const data = {
      enabled: azureData.accountEnabled,
      vis: {
        active: fintElevData.elevforhold.find((forhold: FintElevforhold) => forhold.aktiv || new Date() < new Date(forhold.gyldighetsperiode.start ?? ""))
      }
    };

    if (data.enabled && data.vis.active) {
      return success({ message: "Kontoen er aktivert", raw: data });
    }
    if (data.enabled && !data.vis.active) {
      return warn({ message: "Kontoen er aktivert selv om elev ikke har noen aktive elevforhold" });
    }
    if (!data.enabled && data.vis.active) {
      return warn({
        message: `Kontoen er deaktivert i ${systemNames.azure}, men eleven har aktivt elevforhold i ${systemNames.vis}.`,
        raw: data,
        solution: "Meld sak til arbeidsgruppe IDM i Pureservice"
      });
    }

    return warn({ message: "Ingen aktive elevforhold", raw: data, solution: `Rettes i ${systemNames.vis}` });
  }
};

export const azureUpnEqualsMail: TestCase = {
  id: "azure_equal_mail",
  title: "UPN er lik e-postadressen",
  description: `Sjekker at UPN-et er lik e-postadressen i ${systemNames.ad}`,
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);
    const data = {
      accountEnabled: azureData.accountEnabled,
      mail: azureData.mail || null,
      userPrincipalName: azureData.userPrincipalName || null
    };

    if (!data.userPrincipalName) {
      return error({ message: "UPN (brukernavn til Microsoft 365) mangler 😬", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    }
    if (!data.mail) {
      return error({ message: "E-postadresse mangler 😬", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    }

    return data.userPrincipalName.toLowerCase() === data.mail.toLowerCase()
      ? success({ message: "UPN (brukernavn til Microsoft 365) er lik e-postadressen", raw: data })
      : warn({ message: "UPN (brukernavn til Microsoft 365) er ikke lik e-postadressen", raw: data, solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
  }
};

export const azurePwdSync: TestCase = {
  id: "azure_pwd_sync",
  title: `Passord synkronisert til ${systemNames.azure}`,
  description: `Sjekker at passordet er synkronisert til ${systemNames.azure} innenfor 40 minutter`,
  waitForAllData: true,
  test: (user: TestUser, systemData: SystemData | undefined, allData: AllSystemData) => {
    if (!allData.ad) {
      return error({ message: `Mangler ${systemNames.ad}-data`, raw: allData.ad });
    }

    if (isFailedSystemData(allData.ad)) {
      return error({ message: `Feilet ved henting av data fra ${systemNames.ad}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.ad}` });
    }

    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);
    const adData: ADSystemData = getSystemData<ADSystemData>(allData.ad);
    const pwdCheck: TimeRangeResult = isWithinTimeRange(new Date(adData.pwdLastSet), new Date(azureData.lastPasswordChangeDateTime), aadSyncInSeconds);
    const data = {
      azure: {
        lastPasswordChangeDateTime: azureData.lastPasswordChangeDateTime
      },
      ad: {
        pwdLastSet: adData.pwdLastSet
      },
      seconds: pwdCheck.seconds
    };

    if (adData.pwdLastSet === 0) {
      return warn({ message: "Passord vil synkroniseres når passordet byttes", raw: data });
    }

    if (pwdCheck.result) {
      return success({ message: `Passord synkronisert til ${systemNames.azure}`, raw: data });
    }

    return error({ message: "Passord ikke synkronisert", solution: "Bruker må bytte passord", raw: data });
  }
};

export const azureLicense: TestCase = {
  id: "azure_license",
  title: "Bruker har Microsoft 365-lisenser",
  description: "Sjekker at bruker har Microsoft 365-lisenser",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);

    if (azureData.assignedLicenses.length === 0) {
      return error({ message: "Har ingen Microsoft 365-lisenser 😬", solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
    }

    const data: RawLicenseData = generateRawLicenseData(azureData);

    if (data.hasNecessaryLicenses) {
      return success({ message: "Har Microsoft 365-lisenser", solution: data.licenses.map((lic: License) => lic.name || lic.skuId).join(", "), raw: data });
    }

    if (azureData.accountEnabled) {
      return warn({
        message: `Har ${data.licenses.length} ${pluralizeText("lisens", data.licenses.length, "er")} men mangler nødvendige lisenser`,
        raw: data,
        solution: "Meld sak til arbeidsgruppe IDM i Pureservice"
      });
    }

    return warn({ message: "Kontoen er deaktivert", solution: "Meld sak til arbeidsgruppe IDM i Pureservice" });
  }
};

export const azureLicenseDowngrade: TestCase = {
  id: "azure_license_downgrade",
  title: "Lisens er nedgradert til A1",
  description: "Sjekker om bruker har fått sin lisens nedgradert til A1",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);

    if (!azureData.accountEnabled || azureData.assignedLicenses.length === 0) {
      return ignore();
    }

    if (azureData.onPremisesExtensionAttributes.extensionAttribute11 !== "IDM-A1") {
      return ignore();
    }

    const groupName: string = `${isVestfold() ? "V" : "T"}-TILGANG-NULLSTILL-EXTENSIONATTRIBUTE11`;
    const { licenses: userLicenses } = generateRawLicenseData(azureData);

    return warn({
      message: "Lisens er nedgradert til A1. Med denne lisensen fungerer Office-pakken kun på web",
      solution: `Etter at bruker har logget seg på vil dette nullstilles automatisk. Vent på neste synkronisering av IDM. Om det haster, fjern "IDM-A1" fra ExtensionAttribute11 i lokalt AD og vent inntil 30 minutter. Legg bruker i gruppe "${groupName}". Spør i vaktrommet ved behov.`,
      raw: userLicenses
    });
  }
};

export const azureLicenseA1: TestCase = {
  id: "azure_license_a1",
  title: "Lisens er A1",
  description: "Sjekker om bruker har A1 lisens",
  waitForAllData: false,
  test: (user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);

    if (!azureData.accountEnabled || azureData.assignedLicenses.length === 0 || !user.jobTitle) {
      return ignore();
    }

    const { licenses: userLicenses } = generateRawLicenseData(azureData);

    if (!userLicenses.some((license: License) => license.name?.includes(" A1 "))) {
      return ignore();
    }

    if (a1LicenseTitles.includes(user.jobTitle)) {
      return warn({
        message: `Bruker har A1 lisens grunnet at stillingstittel er ${user.jobTitle}`,
        solution: "Stillingstittel må endres i HR for å få en annen lisens",
        raw: userLicenses
      });
    }

    return warn({
      message: "Bruker har A1 lisens grunnet et eller annet 🤷‍♂️",
      raw: userLicenses,
      solution: "Meld sak til arbeidsgruppe IDM i Pureservice"
    });
  }
};

export const azureLicenseManuallyChanged: TestCase = {
  id: "azure_license_manually_changed",
  title: "Lisens er manuelt endret",
  description: "Sjekker om bruker har fått sin lisens manuelt endret",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);

    if (!azureData.accountEnabled || azureData.assignedLicenses.length === 0) {
      return ignore();
    }

    if (!azureData.onPremisesExtensionAttributes.extensionAttribute2) {
      return ignore();
    }

    const { licenses: userLicenses } = generateRawLicenseData(azureData);

    return warn({
      message: "Lisens er manuelt endret",
      solution: "Lisens er endret manuelt ved å gi en verdi i ExtensionAttribute2. Dersom dette er feil, fjern verdien i lokalt AD og vent inntil 30 minutter. Spør i vaktrommet om du er i tvil",
      raw: {
        extensionAttribute2: azureData.onPremisesExtensionAttributes.extensionAttribute2,
        licenses: userLicenses
      }
    });
  }
};

export const azureMfa: TestCase = {
  id: "azure_mfa",
  title: "Har satt opp MFA",
  description: "Sjekker at MFA er satt opp",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);
    const data = {
      authenticationMethods: azureData.authenticationMethods
    };

    if (azureData.authenticationMethods.length === 0) {
      return error({ message: "MFA (tofaktor) er ikke satt opp 😬", raw: data, solution: "Bruker må selv sette opp MFA (tofaktor) via aka.ms/mfasetup" });
    }

    return success({ message: `${azureData.authenticationMethods.length} ${pluralizeText("MFA-metode", data.authenticationMethods.length, "r")} (tofaktor) er satt opp`, raw: data });
  }
};

export const azurePwdKluss: TestCase = {
  id: "azure_pwd_kluss",
  title: "Har skrevet feil passord",
  description: "Sjekker om bruker har skrevet feil passord i dag",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);
    const data = {
      userSignInErrors: azureData.userSignInErrors.filter((err: AzureUserSignInSystemDataObject) => err.status.errorCode === 50126)
    };

    if (data.userSignInErrors.length > 0) {
      return error({
        message: `Har skrevet feil passord ${data.userSignInErrors.length} ${pluralizeText("gang", data.userSignInErrors.length, "er")} i dag 🤦‍♂️`,
        raw: data,
        solution: "Bruker må ta av boksehanskene 🥊"
      });
    }

    return success({ message: "Ingen klumsing med passord i dag", raw: data });
  }
};

export const azureProxyAddresses: TestCase = {
  id: "azure_proxy_addresses",
  title: "Brukers proxyAddresses",
  description: "Brukers proxyAddresses",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);

    if (azureData.proxyAddresses.length === 0) {
      return error({
        message: "Bruker har ingen proxyAddresses",
        solution: "Hvis dette er feil, meld sak til arbeidsgruppe IDM i Pureservice",
        raw: azureData.proxyAddresses
      });
    }

    return success({
      message: `Bruker har ${azureData.proxyAddresses.length} ${pluralizeText("proxy address", azureData.proxyAddresses.length, "es")}`,
      raw: azureData.proxyAddresses
    });
  }
};

export const azureAdInSync: TestCase = {
  id: "azure_ad_in_sync",
  title: `${systemNames.ad}-bruker og Entra ID-bruker er i sync`,
  description: `Sjekker at ${systemNames.ad}-bruker og ${systemNames.azure}-bruker er i sync`,
  waitForAllData: true,
  test: (user: TestUser, systemData: SystemData | undefined, allData: AllSystemData) => {
    if (!allData.ad) {
      return error({ message: `Mangler data i ${systemNames.ad}`, raw: { user } });
    }

    if (isFailedSystemData(allData.ad)) {
      return error({ message: `Feilet ved henting av data fra ${systemNames.ad}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.ad}` });
    }

    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);
    const adData: ADSystemData = getSystemData<ADSystemData>(allData.ad);
    const data: RawAdInSyncData = {
      azure: {
        accountEnabled: azureData.accountEnabled,
        onPremisesLastSyncDateTime: azureData.onPremisesLastSyncDateTime
      },
      ad: {
        enabled: adData.enabled,
        whenChanged: adData.whenChanged
      },
      isInsideSyncWindow: null
    };

    if (azureData.accountEnabled === adData.enabled) {
      return success({ message: `${systemNames.ad}-bruker og Entra ID-bruker er i sync`, raw: data });
    }

    data.isInsideSyncWindow = isWithinTimeRange(new Date(), new Date(data.ad.whenChanged), aadSyncInSeconds);

    if (!data.isInsideSyncWindow.result) {
      return error({ message: `Entra ID-kontoen er fremdeles ${azureData.accountEnabled ? "" : "in"}aktiv`, raw: data, solution: "Synkronisering utføres snart" });
    }

    return warn({
      message: `Entra ID-kontoen vil bli ${adData.enabled ? "" : "de"}aktivert ved neste synkronisering (innenfor ${aadSyncInMinutes} minutter)`,
      raw: data,
      solution: "Synkronisering utføres snart"
    });
  }
};

export const azureGroups: TestCase = {
  id: "azure_groups",
  title: "Sjekker direktemedlemskap",
  description: "Sjekker brukers direkte gruppemedlemskap",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);
    if (azureData.memberOf.length === 0) {
      return error({ message: `Er ikke medlem av noen ${systemNames.azure} grupper 🤔` });
    }

    const groups = {
      regular: azureData.memberOf.filter((group: string | null | undefined) => !group?.trim().startsWith("MEM-User-")),
      mem: azureData.memberOf.filter((group: string | null | undefined) => group?.trim().startsWith("MEM-User-"))
    };

    if (groups.regular.length > groupWarningLimit) {
      return warn({
        message: `Er direkte medlem av ${groups.regular.length} ${systemNames.azure} ${pluralizeText("gruppe", groups.regular.length, "r")}, og ${groups.mem.length} MEM-${pluralizeText("gruppe", groups.mem.length, "r")} 😵`,
        solution: "Det kan hende brukeren trenger å være medlem av alle disse gruppene, men om du tror det er et problem, meld en sak til arbeidsgruppe IDM i Pureservice",
        raw: groups
      });
    }

    return success({
      message: `Er direkte medlem av ${groups.regular.length} ${systemNames.azure} ${pluralizeText("gruppe", azureData.memberOf.length, "r")}, og ${groups.mem.length} MEM-${pluralizeText("gruppe", groups.mem.length, "r")}`,
      raw: groups
    });
  }
};

export const azureSDSGroups: TestCase = {
  id: "azure_sds_groups",
  title: "Sjekker medlemskap i SDS-grupper",
  description: "Sjekker brukers SDS-gruppemedlemskap",
  waitForAllData: false,
  test: (user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);

    if (azureData.sdsGroups.currentYear.length === 0 && azureData.sdsGroups.previousYear.length === 0) {
      if (user.userType === "elev") {
        return warn({
          message: `Er ikke medlem av noen ${systemNames.sds} grupper 🤔`,
          solution: "Hvis dette er feil, meld sak til arbeidsgruppe IDM i Pureservice",
          raw: azureData.sdsGroups
        });
      }

      return success({
        message: `Er ikke medlem av noen ${systemNames.sds} grupper`,
        solution: "Hvis dette er feil, meld sak til arbeidsgruppe IDM i Pureservice",
        raw: azureData.sdsGroups
      });
    }

    let message: string = "";

    if (azureData.sdsGroups.currentYear.length > 0) {
      message = `Er medlem i ${azureData.sdsGroups.currentYear.length} av årets ${systemNames.sds} grupper`;
    }

    if (azureData.sdsGroups.previousYear.length > 0) {
      message += ` og ${azureData.sdsGroups.previousYear.length} av forrige års ${systemNames.sds} grupper`;
    }

    return success({
      message,
      raw: azureData.sdsGroups
    });
  }
};

export const azureConditionalAccessPersonaGroup: TestCase = {
  id: "azure_conditional_access_persona_group",
  title: "Sjekker medlemskap i conditional access persona group",
  description: "Sjekker om bruker er medlem av en conditional access persona group",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);
    const conditionalAccessPersonaGroups: (string | null | undefined)[] = azureData.memberOf.filter((group: string | null | undefined) =>
      group?.trim().toLowerCase().startsWith("conditional access persona")
    );

    if (conditionalAccessPersonaGroups.length === 0) {
      return error({ message: `Er ikke medlem av noen Conditional Access Persona-grupper i ${systemNames.azure}, og vil ikke kunne logge på 😧`, solution: "Meld sak til sikkerhet i Pureservice" });
    }

    return success({
      message: `Er medlem av ${conditionalAccessPersonaGroups.length} Conditional Access Persona-${pluralizeText("gruppe", conditionalAccessPersonaGroups.length, "r")}`,
      raw: conditionalAccessPersonaGroups
    });
  }
};

export const azureRiskyUser: TestCase = {
  id: "azure_risky_user",
  title: "Er bruker risky",
  description: "Sjekker om bruker finnes i risky users",
  waitForAllData: false,
  test: (user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);
    const data = {
      riskyUser: azureData.graphRiskyUser
    };

    if (data.riskyUser.length > 0) {
      return error({
        message: `Brukeren har havna i risky users, på nivå ${data.riskyUser.map((risk: AzureRiskyUserSystemDataObject) => risk.riskLevel).join("og ")} 😱`,
        solution: "Meld sak til sikkerhet i Pureservice",
        raw: data
      });
    }

    if (user.displayName === "Bjørn Kaarstein") {
      return warn({ message: "Brukeren er ikke i risky users, men ansees likevel som en risiko 🐻", solution: "Send sak til viltnemnda" });
    }

    return success({ message: "Brukeren er ikke i risky users" });
  }
};

export const azureLastSignin: TestCase = {
  id: "azure_last_signin",
  title: "Har bruker klart å logge inn i det siste",
  description: "Sjekker når brukeren klarte å logge på sist",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);
    if (azureData.userSignInSuccess.length === 0) {
      return warn({ message: "Bruker har ikke logget på de siste 3 dagene...", solution: "Be bruker om å logge på" });
    }

    const data = {
      lastSuccessfulSignin: azureData.userSignInSuccess[0]
    };

    const fourteenDaysAsSeconds: number = 1209600;
    const timeSinceLastSignin: TimeRangeResult = isWithinTimeRange(new Date(data.lastSuccessfulSignin.createdDateTime), new Date(), fourteenDaysAsSeconds);
    if (!timeSinceLastSignin.result) {
      return warn({ message: "Det er over 14 dager siden brukeren logget på... Er det ferie mon tro?", raw: { ...data, timeSinceLastSignin } });
    }

    const minutesSinceLogin: number = timeSinceLastSignin.seconds / 60;
    if (minutesSinceLogin < 61) {
      return success({ message: `Brukeren logget på for ${Math.floor(minutesSinceLogin)} minutt${Math.floor(minutesSinceLogin) > 1 ? "er" : ""} siden`, raw: { ...data, timeSinceLastSignin } });
    }

    const hoursSinceLogin: number = minutesSinceLogin / 60;
    if (hoursSinceLogin < 25) {
      return success({ message: `Brukeren logget på for ${Math.floor(hoursSinceLogin)} time${Math.floor(hoursSinceLogin) > 1 ? "r" : ""} siden`, raw: { ...data, timeSinceLastSignin } });
    }

    const daysSinceLogin: number = hoursSinceLogin / 24;
    return success({ message: `Brukeren logget på for ${Math.floor(daysSinceLogin)} dag${Math.floor(daysSinceLogin) > 1 ? "er" : ""} siden`, raw: { ...data, timeSinceLastSignin } });
  }
};

export const azureSignInInfo: TestCase = {
  id: "azure_signin_info",
  title: "Bemerkelsesverdige påloggingshendelser",
  description: "Sjekker bemerkelsesverdige påloggingshendelser",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);
    const data = {
      userSignInErrors: azureData.userSignInErrors
    };

    if (azureData.userSignInErrors.length > 0) {
      return success({
        message: `Har møtt på ${azureData.userSignInErrors.length} ${pluralizeText("bemerkelsesverdig", azureData.userSignInErrors.length, "e")} ${pluralizeText("påloggingshendelse", azureData.userSignInErrors.length, "r")} i dag`,
        raw: data
      });
    }

    return success({ message: "Har ikke møtt på noen bemerkelsesverdige påloggingshendelser i dag", raw: data });
  }
};

export const azureUserDevices: TestCase = {
  id: "azure_user_devices",
  title: "Brukers enheter",
  description: `Brukers enheter i ${systemNames.azure}`,
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return error({ message: `Mangler data i ${systemNames.azure}`, solution: `Rettes i ${systemNames.vis}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(systemData);
    if (azureData.userDevices.length === 0) {
      return warn({ message: "Har ingen registrerte enheter. Kan dette stemme da?", solution: "Dersom brukeren egentlig har en enhet må denne registreres i Intune" });
    }

    return success({
      message: `Har ${azureData.userDevices.length} ${pluralizeText("registrert", azureData.userDevices.length, "e")} ${pluralizeText("enhet", azureData.userDevices.length, "er")}`,
      raw: azureData.userDevices
    });
  }
};
