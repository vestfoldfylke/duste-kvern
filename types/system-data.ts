import type { FintAnsattSystemData, FintElevSystemData, FintLarerSystemData } from "./fint-system-data.js";
import type { SystemWithTestsAndData } from "./system-tests.js";

export type FailedGetDataSystemData = {
  getDataFailed: boolean;
  message: string;
  error: string;
  customMessage?: string | null;
};

export type SystemData = ADSystemData | AzureSystemData | FeideSystemData | FintSystemData | InfoSystemData | NettsperreSystemData | SyncSystemData | FailedGetDataSystemData;

export type AllSystemData = Partial<Record<SystemWithTestsAndData["id"], SystemData>>;

// system data helper objects
export type AzureExtensionAttributes = {
  extensionAttribute1: string | null;
  extensionAttribute2: string | null;
  extensionAttribute3: string | null;
  extensionAttribute4: string | null;
  extensionAttribute5: string | null;
  extensionAttribute6: string | null;
  extensionAttribute7: string | null;
  extensionAttribute8: string | null;
  extensionAttribute9: string | null;
  extensionAttribute10: string | null;
  extensionAttribute11: string | null;
  extensionAttribute12: string | null;
  extensionAttribute13: string | null;
  extensionAttribute14: string | null;
  extensionAttribute15: string | null;
};

export type AzureLicense = {
  disabledPlans?: Omit<AzureLicense, "disabledPlans">[];
  skuId: string;
  skuPartNumber?: string;
  name?: string;
};

// db objects
export type NettsperreRawData = {
  _id: string;
  status: "active" | "pending" | "expired" | "deleted";
  students: Array<{
    id: string;
    displayName: string;
    userPrincipalName: string;
    mail: string;
    officeLocation?: string | null;
  }>;
  teacher: {
    teacherId: string;
    userPrincipalName: string;
    displayName: string;
    officeLocation?: string;
  };
  blockedGroup: {
    id: string;
    displayName: string;
    mail: string;
    description: string;
  };
  typeBlock: {
    type: "eksamen" | "formsFile";
    groupId: string;
  };
  createdBy: {
    userId: string;
    userPrincipalName: string;
    displayName: string;
    officeLocation: string;
  };
  /** This is almost an ISOString. For instance: 2024-10-17T10:10 🤦‍♂️ */
  startBlock: string;
  /** This is almost an ISOString. For instance: 2024-10-17T10:10 🤦‍♂️ */
  endBlock: string;
  createdTimeStamp: string;
  updated: Array<{
    updatedBy: {
      displayName: string;
      teacherId: string;
      userPrincipalName: string;
    };
    updatedTimeStamp: string;
    studentsToRemove: Array<unknown>;
    studentsToAdd: Array<unknown>;
    typeBlockChange: unknown;
    dateBlockChange: unknown;
  }>;
};

// repack objects
export type AzureRiskyUserSystemDataObject = {
  "@odata.type": string;
  id: string;
  isDeleted: boolean;
  isProcessing: boolean;
  riskLastUpdatedDateTime: string;
  riskLevel: string;
  riskState: string;
  riskDetail: string;
  userDisplayName: string;
  userPrincipalName: string;
};

export type AzureUserDeviceSystemDataObject = {
  "@odata.type": string;
  id: string;
  alternativeSecurityIds: undefined;
  deletedDateTime: string | null;
  accountEnabled: boolean;
  createdDateTime: string;
  // there are more properties, but they are not used specifically (add more if needed)
};

export type AzureUserSystemDataObject = {
  id: string;
  accountEnabled: boolean;
  businessPhones: string[];
  companyName: string;
  createdDateTime: string;
  deletedDateTime: string | null;
  department: string;
  displayName: string;
  givenName: string;
  jobTitle: string;
  lastPasswordChangeDateTime: string;
  mail: string;
  mobilePhone: string | null;
  onPremisesDistinguishedName: string | null;
  onPremisesLastSyncDateTime: string | null;
  onPremisesSamAccountName: string | null;
  onPremisesSyncEnabled: boolean | null;
  proxyAddresses: string[];
  signInSessionsValidFromDateTime: string;
  surname: string;
  userPrincipalName: string;
  assignedLicenses: AzureLicense[];
  onPremisesExtensionAttributes: AzureExtensionAttributes;
  onPremisesProvisioningErrors: unknown[];
};

export type AzureUserAuthenticationMethodSystemDataObject = {
  "@odata.type": string;
  id: string;
  displayName: string;
  // there are more properties, but they are not used specifically (add more if needed)
};

export type AzureUserSignInSystemDataObject = {
  createdDateTime: string;
  status: {
    errorCode: number;
    failureReason: string;
    additionalDetails: string;
  };
  // there are more properties, but they are not used specifically (add more if needed)
};

export type NettsperreSystemDataObject = {
  id: string;
  status: NettsperreRawData["status"];
  currentStudent: NettsperreRawData["students"][0] | undefined;
  blockedGroup: string;
  typeBlock: NettsperreRawData["typeBlock"]["type"];
  teacher: string;
  createdBy: string;
  startBlock: NettsperreRawData["startBlock"];
  endBlock: NettsperreRawData["endBlock"];
  createdTimeStamp: string;
};

export type SyncSystemDataObject = {
  id: string;
  onPremisesLastSyncDateTime: string;
};

// system data objects
export type ADSystemData = {
  company: string;
  department: string;
  displayName: string;
  distinguishedName: string;
  employeeNumber: string;
  enabled: boolean;
  extensionAttribute14: string | null;
  extensionAttribute4: string | null;
  extensionAttribute6: string | null;
  extensionAttribute9: string | null;
  givenName: string;
  lockedOut: boolean;
  mail: string;
  memberOf: string[];
  name: string;
  proxyAddresses: string[];
  /** Is set to the number 0 when the user hasn't changed their password yet. After that, this will be an ISO string */
  pwdLastSet: 0 | string;
  samAccountName: string;
  sn: string;
  state: string;
  title: string;
  userPrincipalName: string;
  whenChanged: string;
  whenCreated: string;
};

export type AzureSystemData = AzureUserSystemDataObject & {
  sdsGroups: {
    currentYear: (string | null | undefined)[];
    previousYear: (string | null | undefined)[];
  };
  memberOf: (string | null | undefined)[];
  authenticationMethods: AzureUserAuthenticationMethodSystemDataObject[];
  userSignInErrors: AzureUserSignInSystemDataObject[];
  userSignInSuccess: AzureUserSignInSystemDataObject[];
  graphRiskyUser: AzureRiskyUserSystemDataObject[];
  userDevices: AzureUserDeviceSystemDataObject[];
};

export type FeideSystemData = {
  displayName: string;
  distinguishedName: string;
  eduPersonAffiliation: string[];
  eduPersonEntitlement: string[];
  eduPersonOrgDN: string;
  eduPersonOrgUnitDN: string[];
  eduPersonPrincipalName: string;
  givenName: string;
  mail: string;
  name: string;
  norEduPersonAuthnMethod: string[];
  norEduPersonLIN: string[];
  norEduPersonNIN: string;
  sn: string;
  uid: string[];
  whenChanged: string;
  whenCreated: string;
};

type FintSystemData = FintAnsattSystemData | FintElevSystemData | FintLarerSystemData;

export type InfoSystemData = {
  info: string;
};

export type NettsperreSystemData = {
  activeNettsperrer: NettsperreSystemDataObject[];
  futureNettsperrer: NettsperreSystemDataObject[];
};

export type SyncSystemData = {
  azureSync: {
    lastEntraIDSyncTime: string | null;
  };
};
