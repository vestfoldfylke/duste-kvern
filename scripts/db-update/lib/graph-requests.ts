import { logger } from "@vestfoldfylke/loglady";
import { getEntraToken } from "../../../lib/get-entra-token.js";

const GRAPH = {
  SCOPE: process.env.GRAPH_SCOPE || "https://graph.microsoft.com/.default",
  URL: process.env.GRAPH_URL || "https://graph.microsoft.com",
  TENANT_NAME: process.env.APPREG_TENANT_NAME,
  TEACHER_GROUP_ID: process.env.GRAPH_TEACHER_GROUP_ID,
  EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE: process.env.GRAPH_EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE
};

if (!GRAPH.TEACHER_GROUP_ID) throw new Error("Har du glemt å legge inn GRAPH_TEACHER_GROUP_ID i .env på rot mon tro?");
if (!GRAPH.EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE) throw new Error("Har du glemt å legge inn GRAPH_EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE i .env på rot mon tro?");

const userSelect = "id,accountEnabled,displayName,givenName,surname,userPrincipalName,jobTitle,state,department,companyName";

type EntraUsers = {
  count: number;
  value: any[];
};

const getGraphData = async (url: string, accessBearer: string, type: string): Promise<any> => {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessBearer}`,
      ConsistencyLevel: "eventual"
    }
  });

  if (!response.ok) {
    const errorBody = await response.json();
    logger.errorException(errorBody, "{Type} - Failed to fetch graph data. Status: {Status}, StatusText: {StatusText}", type, response.status, response.statusText);
    throw new Error(`${type} - Failed to fetch graph data. Status: ${response.status}, StatusText: ${response.statusText}. Error: ${errorBody}`);
  }

  return response.json();
};

const getGraphResult = async (url: string | undefined, type: string): Promise<EntraUsers> => {
  const bearer = await getEntraToken(GRAPH.SCOPE);
  let finished = false;

  const result: EntraUsers = {
    count: 0,
    value: []
  };

  let page = 0;

  while (!finished && url) {
    const data = await getGraphData(url, bearer, type);
    logger.info("{Type} - Got {ElementCount} elements from page {Page}, will check for more", type, data.value.length, page);

    finished = data["@odata.nextLink"] === undefined;
    url = data["@odata.nextLink"];
    result.value = result.value.concat(data.value);
    page++;
  }

  result.count = result.value.length;
  return result;
};

export const getAllEmployees = async (): Promise<EntraUsers> => {
  const url = `${GRAPH.URL}/v1.0/users/?$select=${userSelect},onPremisesSamAccountName,onPremisesExtensionAttributes,${GRAPH.EMPLOYEE_NUMBER_EXTENSION_ATTRIBUTE}&$filter=onPremisesExtensionAttributes/extensionAttribute9 ne null and endsWith(userPrincipalName, '@${GRAPH.TENANT_NAME}.no')&$count=true&$top=999`;
  return await getGraphResult(url, "getAllEmployees");
};

export const getAllStudents = async (): Promise<EntraUsers> => {
  const url = `${GRAPH.URL}/v1.0/users/?$select=${userSelect}&$filter=endsWith(userPrincipalName, '@skole.${GRAPH.TENANT_NAME}.no')&$count=true&$top=999`;
  return await getGraphResult(url, "getAllStudents");
};

export const getTeacherGroupMembers = async (): Promise<EntraUsers> => {
  const url = `${GRAPH.URL}/v1.0/groups/${GRAPH.TEACHER_GROUP_ID}/members?$select=id,userPrincipalName&$count=true&$top=999`;
  return await getGraphResult(url, "getTeacherGroupMembers");
};

export const getAllDeletedStudents = async (): Promise<EntraUsers> => {
  const url = `${GRAPH.URL}/v1.0/directory/deletedItems/microsoft.graph.user?$select=${userSelect}&$filter=endsWith(userPrincipalName, '@skole.${GRAPH.TENANT_NAME}.no')&$count=true&$top=999`;
  return await getGraphResult(url, "getAllDeletedStudents");
};
