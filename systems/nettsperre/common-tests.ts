import { pluralizeText } from "../../lib/helpers/pluralize-text.js";
import { error, ignore, success, warn } from "../../lib/test-result.js";
import systemNames from "../system-names.js";

export const nettsperreHarNettsperre = {
  id: "nettsperre_har_nettsperre",
  title: "Brukeren har aktiv nettsperre",
  description: "Sjekker om brukeren har aktiv nettsperre",
  waitForAllData: true,
  test: (user: any, systemData: any, allData: any) => {
    if (!allData.azure) return error({ message: `Mangler data i ${systemNames.azure}`, raw: { user }, solution: `Rettes i ${systemNames.azure}` });
    if (allData.azure.getDataFailed) return error({ message: `Feilet ved henting av data fra ${systemNames.azure}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.azure}` });
    const nettsperreGroups = ["NETTSPERRE-EKSAMEN-MAN"];
    const memberOfNettsperreGroups = allData.azure.memberOf.filter((group: string) => nettsperreGroups.includes(group));

    const isInNettsperreGroup = memberOfNettsperreGroups.length > 0;

    const data = {
      isInNettsperreGroup,
      hasActiveNettsperre: systemData.activeNettsperrer.length > 0,
      activeNettsperrer: systemData.activeNettsperrer
    };

    if (data.hasActiveNettsperre && !data.isInNettsperreGroup)
      return error({ message: `Brukeren skal ha nettsperre, men ligger ikke i nettsperre-gruppe i ${systemNames.azure} 💀`, raw: data, solution: "Her har det skjedd noe galt - spør i vaktrommet" });
    if (!data.hasActiveNettsperre && data.isInNettsperreGroup)
      return error({
        message: `Brukeren har ingen aktive nettsperrer, men ligger i nettsperre-gruppe i ${systemNames.azure}`,
        raw: data,
        solution: `Mulig brukeren har blitt lagt inn manuelt - brukeren må fjernes manuelt fra grupper: ${memberOfNettsperreGroups.join(", ")}`
      });
    if (!data.hasActiveNettsperre && !data.isInNettsperreGroup) return success({ message: "Brukeren har ingen aktive nettsperrer" });
    if (data.hasActiveNettsperre && data.isInNettsperreGroup) {
      if (data.activeNettsperrer.length === 1) {
        const blockedGroup = data.activeNettsperrer[0].blockedGroup;
        const blockedByTeacher = data.activeNettsperrer[0].teacher;
        return warn({
          message: `Brukeren er i nettsperre via gruppen ${blockedGroup} satt av lærer ${blockedByTeacher}`,
          raw: data,
          solution: "Dette er vanligvis korrekt - dersom eleven mener at det ikke skal være nettsperre på kontoen, må læreren kontaktes for å sjekke om dette stemmer."
        });
      }

      return warn({
        message: `Brukeren har ${data.activeNettsperrer.length} aktive nettsperrer. Klikk Vis data for informasjon om hvilke grupper og lærere som har satt sperringene`,
        raw: data,
        solution: "Dette er vanligvis korrekt - dersom eleven mener at det ikke skal være nettsperre på kontoen, må læreren kontaktes for å sjekke om dette stemmer."
      });
    }
  }
};

export const nettsperrePending = {
  id: "nettsperre_pending",
  title: "Brukeren har planlagte nettsperrer",
  description: "Sjekker om brukeren har planlagte nettsperrer",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    if (systemData.futureNettsperrer.length === 0) return ignore();
    if (systemData.futureNettsperrer.length > 0)
      return success({
        message: `Brukeren har ${systemData.futureNettsperrer.length} ${pluralizeText("planlagt", systemData.futureNettsperrer.length, "e")} ${pluralizeText("nettsperre", systemData.futureNettsperrer.length, "r")}`,
        raw: systemData.futureNettsperrer
      });
  }
};

export const nettsperreOverlappende = {
  id: "nettsperre_overlappende",
  title: "Brukeren har overlappende nettsperrer",
  description: "Sjekker om brukeren har overlappende nettsperrer",
  waitForAllData: false,
  test: (_user: any, systemData: any) => {
    const allNettsperrer = [...systemData.activeNettsperrer, ...systemData.futureNettsperrer];

    const overlappendeSperringer: Array<{ sperring: any; overlapping: any[] }> = [];
    for (const sperring of allNettsperrer) {
      const startTime = new Date(sperring.startBlock);
      const endTime = new Date(sperring.endBlock);
      const overlapping = allNettsperrer
        .filter((sperre: any) => sperre.id !== sperring.id)
        .filter((sperre: any) => {
          const currentSperreStartTime = new Date(sperre.endBlock);
          return currentSperreStartTime >= startTime && currentSperreStartTime <= endTime;
        });
      if (overlapping.length > 0) overlappendeSperringer.push({ sperring, overlapping });
    }

    const repackOverlappendeSperring = (sperre: any) => {
      return {
        id: sperre.id,
        status: sperre.status,
        klasse: sperre.blockedGroup,
        teacher: sperre.teacher,
        createdBy: sperre.createdBy,
        startTime: sperre.startBlock,
        endTime: sperre.endBlock
      };
    };

    const repackedOverlappendeSperringer = overlappendeSperringer.map((sperring) => {
      const currentSperring = repackOverlappendeSperring(sperring.sperring);
      const overlappende = sperring.overlapping.map((sperre: any) => repackOverlappendeSperring(sperre));
      return {
        sperring: currentSperring,
        overlappende
      };
    });

    if (overlappendeSperringer.length === 0) return ignore();
    if (overlappendeSperringer.length > 0)
      return warn({
        message: `Brukeren har ${repackedOverlappendeSperringer.length} overlappende ${pluralizeText("nettsperr", repackedOverlappendeSperringer.length, "inger", "e")} - dette kan by på problemer...`,
        raw: repackedOverlappendeSperringer,
        solution: "Sjekk rawdata og be aktuelle lærere sjekke at de har satt sperringen sin på korrekt tidspunkt"
      });
  }
};
