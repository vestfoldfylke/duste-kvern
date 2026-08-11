import invokePS from "../../lib/invoke-ps-script.js";
import type { FeideSystemData } from "../../types/system-data.js";

export const getData = async (user: { samAccountName?: string; feidenavn?: string }): Promise<FeideSystemData | Error> => {
  const samAccountName: string | null = user.samAccountName || (user.feidenavn ? user.feidenavn.substring(0, user.feidenavn.indexOf("@")) : null);
  return await invokePS<FeideSystemData>("Get-DUSTFeide.ps1", { samAccountName });
};
