import invokePS from "../../lib/invoke-ps-script.js";

export const getData = async (user: { samAccountName?: string; feidenavn?: string }): Promise<unknown> => {
  const samAccountName = user.samAccountName || (user.feidenavn ? user.feidenavn.substring(0, user.feidenavn.indexOf("@")) : null);
  return await invokePS("Get-DUSTFeide.ps1", { samAccountName });
};
