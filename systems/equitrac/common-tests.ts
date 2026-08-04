import { error, success, warn } from "../../lib/test-result.js";
import systemNames from "../system-names.js";

export const equitracLocked = {
  id: "equitrac_locked",
  title: "Kontoen er ulåst",
  description: "Sjekker at kontoen er ulåst",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    const data = {
      accountStatus: systemData.AccountStatus,
      previousAccountStatus: systemData.PreviousAccountStatus || undefined
    };
    if (data.previousAccountStatus) return warn({ message: `Bruker var låst i ${systemNames.equitrac} men er nå låst opp! 👌`, raw: data });
    return success({ message: `Bruker er ikke låst i ${systemNames.equitrac}`, raw: data });
  }
};

export const equitracEmailEqualUpn = {
  id: "equitrac_email_upn",
  title: "UserEmail er lik UPN",
  description: "Sjekker at UserEmail er lik UserPrincipalName",
  waitForAllData: false,
  test: (user: any, systemData: any) => {
    const data = {
      equitrac: {
        userEmail: systemData.UserEmail
      },
      ad: {
        userPrincipalName: user.userPrincipalName
      }
    };
    if (systemData.UserEmail !== data.ad.userPrincipalName) return error({ message: "UserEmail er ikke korrekt", raw: data, solution: "Sak meldes til arbeidsgruppe blekkulf" });
    return success({ message: "UserEmail er korrekt", raw: data });
  }
};
