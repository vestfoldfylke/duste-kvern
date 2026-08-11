import { getSystemData } from "../lib/helpers/system-data.js";
import { warn } from "../lib/test-result.js";
import systemNames from "../systems/system-names.js";
import type { FintElevforhold, FintElevSystemData, FintPeriode } from "../types/fint-system-data.js";
import type { SystemData } from "../types/system-data.js";
import type { SystemWithTestsAndData, TestUser } from "../types/system-tests.js";

type MiniFintElevforhold = {
  systemId: string;
  aktiv: boolean;
  gyldighetsperiode: FintPeriode;
};

export const systemsAndTests: SystemWithTestsAndData[] = [
  {
    id: "info",
    name: systemNames.info,
    description: null,
    tests: [
      {
        id: "info_deleted",
        title: "Brukeren er sletta",
        description: "Gir beskjed om at brukeren er sletta",
        waitForAllData: false,
        test: (_user: TestUser, _systemData: SystemData | undefined) => {
          return warn({ message: "Elevens konto er slettet" });
        }
      }
    ]
  },
  {
    id: "fint-elev",
    name: systemNames.vis,
    description: null,
    tests: [
      {
        id: "fint_student_utgatte_elevforhold",
        title: "Har aktiv(e) eller utgått(e) elevforhold",
        description: "Sjekker om bruker har aktiv(e) eller utgått(e) elevforhold",
        waitForAllData: false,
        test: (_user: TestUser, systemData: SystemData | undefined) => {
          if (!systemData) {
            return warn({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis} dersom eleven ikke skal være sletta` });
          }

          const fintData: FintElevSystemData = getSystemData<FintElevSystemData>(systemData);
          const aktiveElevforhold: FintElevforhold[] = fintData.elevforhold.filter((forhold: FintElevforhold) => forhold.aktiv);

          if (aktiveElevforhold.length > 0) {
            return warn({
              message: `Har ${aktiveElevforhold.length} aktiv${aktiveElevforhold.length === 1 ? "t" : "e"} elevforhold, men er sletta!`,
              raw: fintData.elevforhold,
              solution: "Vent på sync, om det ikke hjelper ta kontakt med arbeidsgruppe IDM i Pureservice"
            });
          }

          const inaktiveElevforhold: FintElevforhold[] = fintData.elevforhold.filter((forhold: FintElevforhold) => !forhold.aktiv);
          if (inaktiveElevforhold.length === 0) {
            return warn({ message: "Har ingen elevforhold i det hele tatt", solution: `Rettes i ${systemNames.vis} dersom eleven skal ha elevforhold` });
          }

          const elevfoholdInTheFuture: FintElevforhold | undefined = inaktiveElevforhold.find((forhold: FintElevforhold) => new Date() < new Date(forhold.gyldighetsperiode.start ?? ""));
          if (elevfoholdInTheFuture) {
            return warn({
              message: `Elevens elevforhold begynner ikke før ${elevfoholdInTheFuture.gyldighetsperiode.start?.substring(0, 10)}`,
              solution: `Sannsynligvis ikke noe problem, hvertfall ikke hvis det er like før skolestart. Men om det er midt i skoleåret kan det rettes i ${systemNames.vis}`
            });
          }

          if (inaktiveElevforhold.length > 0) {
            const mappedRaw: MiniFintElevforhold[] = fintData.elevforhold.map((forhold: FintElevforhold) => ({
              systemId: forhold.systemId,
              aktiv: forhold.aktiv,
              gyldighetsperiode: forhold.gyldighetsperiode
            }));

            return warn({ message: `Eleven har ingen aktive elevforhold, og er derfor slettet i ${systemNames.azure}. Rettes i ${systemNames.vis} dersom eleven skal ha konto.`, raw: mappedRaw });
          }

          return warn({ message: "Utvikler har driti seg ut og mangler en case her...." });
        }
      }
    ]
  }
];
