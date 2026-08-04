import { logger } from "@vestfoldfylke/loglady";
import { GRAPH } from "../../config.js";
import { getEntraToken } from "../../lib/get-entra-token.js";
import { entraIdDate } from "../../lib/helpers/date-time-output.js";

const excludeSignInErrors = [70043];

export const callGraph = async (resource: string, accessBearer: string): Promise<any> => {
  const response = await fetch(`${GRAPH.URL}/v1.0/${resource}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessBearer}`
    }
  });

  if (!response.ok) {
    const errorBody = await response.json();
    logger.errorException(errorBody, "Failed to fetch {Resource} graph data. Status: {Status}, StatusText: {StatusText}", resource, response.status, response.statusText);
    throw new Error(`Failed to fetch ${resource} graph data. Status: ${response.status}, StatusText: ${response.statusText}. Error: ${errorBody}`);
  }

  return response.json();
};

const batchGraph = async (batchRequest: unknown, accessBearer: string): Promise<any> => {
  const response = await fetch(`${GRAPH.URL}/v1.0/$batch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessBearer}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(batchRequest)
  });

  if (!response.ok) {
    const errorBody = await response.json();
    logger.errorException(errorBody, "Failed to POST graph batch request. Status: {Status}, StatusText: {StatusText}", response.status, response.statusText);
    throw new Error(`Failed to POST graph batch request. Status: ${response.status}, StatusText: ${response.statusText}. Error: ${errorBody}`);
  }

  return response.json();
};

const getSchoolYear = (yearsBack = 0): string => {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = Number.parseInt(today.getFullYear().toString().slice(-2), 10) - yearsBack;

  if (currentMonth >= 8 && currentMonth <= 12) {
    return `${currentYear}${currentYear + 1}`;
  }

  return `${currentYear - 1}${currentYear}`;
};

export const getData = async (user: { userPrincipalName: string }): Promise<any> => {
  const bearer = await getEntraToken(GRAPH.SCOPE);

  const userProperties = [
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

  const today = new Date();
  const threeDaysBack = new Date(new Date().setDate(today.getDate() - 3));

  const batchRequest = {
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
  const failedRequest = responses.find((response: any) => response.status !== 200 && response.status !== 429);
  if (failedRequest) {
    throw new Error(`Batch request feilet.. id: ${failedRequest.id}, Message: ${failedRequest.body?.error?.message}, Code: ${failedRequest.body?.error?.code}, status: ${failedRequest.status}`);
  }
  const retryRequests = responses.filter((response: any) => response.status === 429);
  if (retryRequests.length > 0) {
    throw new Error("Aiaiai, for mange spørringer mot MS Graph på en gang - her må vi bare vente altså, ta en kaffe...");
  }

  const currentSchoolYear = getSchoolYear();
  const previousSchoolYear = getSchoolYear(1);

  const userData = responses.find((res: any) => res.id === "1").body;

  const graphUserGroups = responses.find((res: any) => res.id === "2").body;
  const graphUserGroupsDisplayName = graphUserGroups?.value?.map((group: any) => group.displayName).sort() || [];
  const graphSDSGroups = (graphUserGroups?.value && Array.isArray(graphUserGroups.value) && graphUserGroups.value.filter((group: any) => group.mailNickname?.startsWith("Section_"))) || [];
  const graphSDSGroupsCurrentYearDisplayName = graphSDSGroups
    .filter((group: any) => group.mailNickname.includes(currentSchoolYear))
    .map((group: any) => group.displayName)
    .sort();
  const graphSDSGroupsPreviousYearDisplayName = graphSDSGroups
    .filter((group: any) => group.mailNickname.includes(previousSchoolYear))
    .map((group: any) => group.displayName)
    .sort();

  const graphUserAuth = responses.find((res: any) => res.id === "3").body;
  const graphUserAuthMethods = graphUserAuth?.value?.length && graphUserAuth.value.filter((method: any) => !method["@odata.type"].includes("passwordAuthenticationMethod"));

  const userSignInSuccess = responses.find((res: any) => res.id === "4").body;

  const userSignInErrors = responses.find((res: any) => res.id === "5").body;
  const filteredSignInErrors = userSignInErrors.value?.filter((signIn: any) => !excludeSignInErrors.includes(signIn.status.errorCode));

  const graphRiskyUser = responses.find((res: any) => res.id === "6").body;

  const userDevices = responses.find((res: any) => res.id === "7").body;
  const mappedUserDevices = userDevices.value?.map((device: any) => {
    device.alternativeSecurityIds = undefined;
    return device;
  });

  return {
    ...userData,
    sdsGroups: {
      currentYear: graphSDSGroupsCurrentYearDisplayName,
      previousYear: graphSDSGroupsPreviousYearDisplayName
    },
    memberOf: graphUserGroupsDisplayName,
    authenticationMethods: graphUserAuthMethods,
    userSignInErrors: filteredSignInErrors,
    userSignInSuccess: userSignInSuccess.value,
    graphRiskyUser: graphRiskyUser.value,
    userDevices: mappedUserDevices
  };
};
