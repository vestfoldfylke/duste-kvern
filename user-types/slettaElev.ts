import { warn } from "../lib/test-result.js";
import systemNames from "../systems/system-names.js";

export const systemsAndTests = [
  {
    id: "info",
    name: systemNames.info,
    tests: [
      {
        id: "info_deleted",
        title: "Brukeren er sletta",
        description: "Gir beskjed om at brukeren er sletta",
        waitForAllData: false,
        test: (_user: any, _systemData: any) => {
          return warn({ message: "Elevens konto er slettet" });
        }
      }
    ]
  },
  {
    id: "fint-elev",
    name: systemNames.vis,
    tests: [
      {
        id: "fint_student_utgatte_elevforhold",
        title: "Har aktiv(e) eller utgått(e) elevforhold",
        description: "Sjekker om bruker har aktiv(e) eller utgått(e) elevforhold",
        waitForAllData: false,
        test: (_user: any, systemData: any) => {
          if (!systemData) return warn({ message: `Mangler data i ${systemNames.vis}`, solution: `Rettes i ${systemNames.vis} dersom eleven ikke skal være sletta` });
          const aktiveElevforhold = systemData.elevforhold.filter((forhold: any) => forhold.aktiv);
          if (aktiveElevforhold.length > 0)
            return warn({
              message: `Har ${aktiveElevforhold.length} aktiv${aktiveElevforhold.length === 1 ? "t" : "e"} elevforhold, men er sletta!`,
              raw: systemData.elevforhold,
              solution: "Vent på sync, om det ikke hjelper ta kontakt med arbeidsgruppe IDM i Pureservice"
            });
          const inaktiveElevforhold = systemData.elevforhold.filter((forhold: any) => !forhold.aktiv);
          if (inaktiveElevforhold.length === 0) return warn({ message: "Har ingen elevforhold i det hele tatt", solution: `Rettes i ${systemNames.vis} dersom eleven skal ha elevforhold` });
          const elevfoholdInTheFuture = inaktiveElevforhold.find((forhold: any) => new Date() < new Date(forhold.gyldighetsperiode.start));
          if (elevfoholdInTheFuture)
            return warn({
              message: `Elevens elevforhold begynner ikke før ${elevfoholdInTheFuture.gyldighetsperiode.start.substring(0, 10)}`,
              solution: `Sannsynligvis ikke noe problem, hvertfall ikke hvis det er like før skolestart. Men om det er midt i skoleåret kan det rettes i ${systemNames.vis}`
            });
          if (inaktiveElevforhold.length > 0) {
            const mappedRaw = systemData.elevforhold.map((forhold: any) => ({
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
