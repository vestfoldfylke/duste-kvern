import { COUNTY_OU } from "../../config.js";
import invokePS from "../../lib/invoke-ps-script.js";

export const getData = async (user: { userPrincipalName: string }): Promise<unknown> => {
  return await invokePS("Get-DUSTUser.ps1", { userPrincipalName: user.userPrincipalName, domain: "login", countyOU: COUNTY_OU });
};
