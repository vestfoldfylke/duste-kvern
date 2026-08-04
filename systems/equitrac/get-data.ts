import invokePS from "../../lib/invoke-ps-script.js";

export const getData = async (user: { samAccountName: string }): Promise<unknown> => {
  return await invokePS("Get-DUSTEquitrac.ps1", { samAccountName: user.samAccountName });
};
