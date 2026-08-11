import type * as GraphTypes from "@microsoft/microsoft-graph-types";
import { logger } from "@vestfoldfylke/loglady";
import { GRAPH } from "../../config.js";
import { getEntraToken } from "../../lib/get-entra-token.js";
import { entraIdDate } from "../../lib/helpers/date-time-output.js";
import type { Groups } from "../../scripts/db-update/types/graph.js";
import type { AzureDataWrapper, BatchRequest, BatchRequestResponse, BatchRequestResponseType } from "../../types/azure.js";
import type {
  AzureRiskyUserSystemDataObject,
  AzureSystemData,
  AzureUserAuthenticationMethodSystemDataObject,
  AzureUserDeviceSystemDataObject,
  AzureUserSignInSystemDataObject,
  AzureUserSystemDataObject
} from "../../types/system-data.js";
import type { TestUser } from "../../types/system-tests.js";

const excludeSignInErrors: number[] = [70043];

export const callGraph = async <T>(resource: string, accessBearer: string): Promise<AzureDataWrapper<T>> => {
  const response: Response = await fetch(`${GRAPH.URL}/v1.0/${resource}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessBearer}`
    }
  });

  if (!response.ok) {
    const errorBody: unknown = await response.json();
    logger.errorException(errorBody, "Failed to fetch {Resource} graph data. Status: {Status}, StatusText: {StatusText}", resource, response.status, response.statusText);
    throw new Error(`Failed to fetch ${resource} graph data. Status: ${response.status}, StatusText: ${response.statusText}. Error: ${errorBody}`);
  }

  return (await response.json()) as AzureDataWrapper<T>;
};

const batchGraph = async (batchRequest: BatchRequest, accessBearer: string): Promise<BatchRequestResponse> => {
  const response: Response = await fetch(`${GRAPH.URL}/v1.0/$batch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessBearer}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(batchRequest)
  });

  if (!response.ok) {
    const errorBody: unknown = await response.json();
    logger.errorException(errorBody, "Failed to POST graph batch request. Status: {Status}, StatusText: {StatusText}", response.status, response.statusText);
    throw new Error(`Failed to POST graph batch request. Status: ${response.status}, StatusText: ${response.statusText}. Error: ${errorBody}`);
  }

  return (await response.json()) as BatchRequestResponse;
};

const getSchoolYear = (yearsBack: number = 0): string => {
  const today: Date = new Date();
  const currentMonth: number = today.getMonth() + 1;
  const currentYear: number = Number.parseInt(today.getFullYear().toString().slice(-2), 10) - yearsBack;

  if (currentMonth >= 8 && currentMonth <= 12) {
    return `${currentYear}${currentYear + 1}`;
  }

  return `${currentYear - 1}${currentYear}`;
};

export const getData = async (user: TestUser): Promise<AzureSystemData> => {
  const bearer: string = await getEntraToken(GRAPH.SCOPE);

  const userProperties: string = [
    "id",
    "accountEnabled",
    "assignedLicenses",
    "businessPhones",
    "companyName",
    "createdDateTime",
    "deletedDateTime",
    "department",
    "displayName",
    "givenName",
    "jobTitle",
    "lastPasswordChangeDateTime",
    "mail",
    "mobilePhone",
    "onPremisesDistinguishedName",
    "onPremisesExtensionAttributes",
    "onPremisesLastSyncDateTime",
    "onPremisesProvisioningErrors",
    "onPremisesSamAccountName",
    "onPremisesSyncEnabled",
    "proxyAddresses",
    "signInSessionsValidFromDateTime",
    "surname",
    "userPrincipalName"
  ].join(",");

  const today: Date = new Date();
  const threeDaysBack: Date = new Date(new Date().setDate(today.getDate() - 3));

  const batchRequest: BatchRequest = {
    requests: [
      {
        id: "1",
        method: "GET",
        url: `/users/${user.userPrincipalName}?$select=${userProperties}`
      },
      {
        id: "2",
        method: "GET",
        url: `/users/${user.userPrincipalName}/transitiveMemberOf?$top=999`
      },
      {
        id: "3",
        method: "GET",
        url: `/users/${user.userPrincipalName}/authentication/methods`
      },
      {
        id: "4",
        method: "GET",
        url: `/auditLogs/signIns?$filter=userPrincipalName eq '${user.userPrincipalName}' and status/errorCode eq 0 and createdDateTime gt ${entraIdDate(threeDaysBack)}&$top=1`
      },
      {
        id: "5",
        method: "GET",
        url: `/auditLogs/signIns?$filter=userPrincipalName eq '${user.userPrincipalName}' and status/errorCode ne 0 and createdDateTime gt ${entraIdDate()}&$top=30`
      },
      {
        id: "6",
        method: "GET",
        url: `/identityProtection/riskyUsers?$filter=userPrincipalName eq '${user.userPrincipalName}' and riskState ne 'dismissed' and riskState ne 'remediated' and riskState ne 'confirmedSafe'`
      },
      {
        id: "7",
        method: "GET",
        url: `/users/${user.userPrincipalName}/ownedDevices`
      }
    ]
  };

  logger.info("azure-get-data - fetching data from ms graph");
  const { responses } = await batchGraph(batchRequest, bearer);
  const failedRequest: BatchRequestResponseType | undefined = responses.find((response: BatchRequestResponseType) => response.status !== 200 && response.status !== 429);
  if (failedRequest) {
    if ("error" in failedRequest.body) {
      throw new Error(`Batch request feilet.. id: ${failedRequest.id}, Message: ${failedRequest.body?.error?.message}, Code: ${failedRequest.body?.error?.code}, status: ${failedRequest.status}`);
    }

    throw new Error(`Batch request feilet.. id: ${failedRequest.id}, Message: "error" property not found..., status: ${failedRequest.status}`);
  }
  const retryRequests: BatchRequestResponseType[] = responses.filter((response: BatchRequestResponseType) => response.status === 429);
  if (retryRequests.length > 0) {
    throw new Error(
      `Aiaiai, for mange spørringer mot MS Graph på en gang - her må vi bare vente altså, ta en kaffe... ${retryRequests.length} spørringer av ${batchRequest.requests.length} venter...`
    );
  }

  const currentSchoolYear: string = getSchoolYear();
  const previousSchoolYear: string = getSchoolYear(1);

  const userData: AzureUserSystemDataObject | undefined = responses.find((res: BatchRequestResponseType) => res.id === "1")?.body as AzureUserSystemDataObject;
  if (!userData) {
    logger.error("UserData with BatchRequestId {BatchRequestId} was not found in azure data response: {@Response}", "1", responses);
    throw new Error("UserData with BatchRequestId '1' was not found in azure data response");
  }

  const graphUserGroups: Groups | undefined = responses.find((res: BatchRequestResponseType) => res.id === "2")?.body as Groups;
  const graphUserGroupsDisplayNames: (string | null | undefined)[] = graphUserGroups?.value?.map((group: GraphTypes.Group) => group.displayName).sort() || [];
  const graphSDSGroups: GraphTypes.Group[] =
    (graphUserGroups?.value && Array.isArray(graphUserGroups.value) && graphUserGroups.value.filter((group: GraphTypes.Group) => group.mailNickname?.startsWith("Section_"))) || [];
  const graphSDSGroupsCurrentYearDisplayName: (string | null | undefined)[] = graphSDSGroups
    .filter((group: GraphTypes.Group) => group.mailNickname?.includes(currentSchoolYear))
    .map((group: GraphTypes.Group) => group.displayName)
    .sort();
  const graphSDSGroupsPreviousYearDisplayName: (string | null | undefined)[] = graphSDSGroups
    .filter((group: GraphTypes.Group) => group.mailNickname?.includes(previousSchoolYear))
    .map((group: GraphTypes.Group) => group.displayName)
    .sort();

  const graphUserAuth: AzureDataWrapper<AzureUserAuthenticationMethodSystemDataObject[]> | undefined = responses.find((res: BatchRequestResponseType) => res.id === "3")?.body as AzureDataWrapper<
    AzureUserAuthenticationMethodSystemDataObject[]
  >;
  const graphUserAuthMethods: AzureUserAuthenticationMethodSystemDataObject[] =
    (graphUserAuth?.value?.length && graphUserAuth.value.filter((method: AzureUserAuthenticationMethodSystemDataObject) => !method["@odata.type"].includes("passwordAuthenticationMethod"))) || [];

  const userSignInSuccess: AzureDataWrapper<AzureUserSignInSystemDataObject[]> | undefined = responses.find((res: BatchRequestResponseType) => res.id === "4")?.body as AzureDataWrapper<
    AzureUserSignInSystemDataObject[]
  >;

  const userSignInErrors: AzureDataWrapper<AzureUserSignInSystemDataObject[]> | undefined = responses.find((res: BatchRequestResponseType) => res.id === "5")?.body as AzureDataWrapper<
    AzureUserSignInSystemDataObject[]
  >;
  const filteredSignInErrors: AzureUserSignInSystemDataObject[] =
    userSignInErrors?.value?.filter((signIn: AzureUserSignInSystemDataObject) => !excludeSignInErrors.includes(signIn.status.errorCode)) || [];

  const graphRiskyUser: AzureDataWrapper<AzureRiskyUserSystemDataObject[]> | undefined = responses.find((res: BatchRequestResponseType) => res.id === "6")?.body as AzureDataWrapper<
    AzureRiskyUserSystemDataObject[]
  >;

  const userDevices: AzureDataWrapper<AzureUserDeviceSystemDataObject[]> | undefined = responses.find((res: BatchRequestResponseType) => res.id === "7")?.body as AzureDataWrapper<
    AzureUserDeviceSystemDataObject[]
  >;
  const mappedUserDevices: AzureUserDeviceSystemDataObject[] =
    userDevices?.value?.map((device: AzureUserDeviceSystemDataObject) => {
      device.alternativeSecurityIds = undefined;
      return device;
    }) || [];

  return {
    ...userData,
    sdsGroups: {
      currentYear: graphSDSGroupsCurrentYearDisplayName,
      previousYear: graphSDSGroupsPreviousYearDisplayName
    },
    memberOf: graphUserGroupsDisplayNames,
    authenticationMethods: graphUserAuthMethods,
    userSignInErrors: filteredSignInErrors,
    userSignInSuccess: userSignInSuccess?.value ?? [],
    graphRiskyUser: graphRiskyUser?.value ?? [],
    userDevices: mappedUserDevices
  };
};
