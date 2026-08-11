import { COUNTY_OU } from "../../config.js";
import invokePS from "../../lib/invoke-ps-script.js";
import type { ADSystemData } from "../../types/system-data.js";
import type { TestUser } from "../../types/system-tests.js";

export const getData = async (user: TestUser): Promise<ADSystemData | Error> => {
  return await invokePS<ADSystemData>("Get-DUSTUser.ps1", { userPrincipalName: user.userPrincipalName, domain: "login", countyOU: COUNTY_OU });
};
