import { pluralizeText } from "../../lib/helpers/pluralize-text.js";
import { getSystemData } from "../../lib/helpers/system-data.js";
import { error, ignore, isFailedSystemData, success, warn } from "../../lib/test-result.js";
import type { AllSystemData, AzureSystemData, NettsperreSystemData, NettsperreSystemDataObject, SystemData } from "../../types/system-data.js";
import type { TestCase, TestUser } from "../../types/system-tests.js";
import systemNames from "../system-names.js";

type MiniNettsperreSystemDataObject = Omit<NettsperreSystemDataObject, "currentStudent" | "blockedGroup" | "typeBlock" | "startBlock" | "endBlock" | "createdTimeStamp"> & {
  klasse: NettsperreSystemDataObject["blockedGroup"];
  startTime: NettsperreSystemDataObject["startBlock"];
  endTime: NettsperreSystemDataObject["endBlock"];
};

type MiniOverlappendesperring = {
  sperring: MiniNettsperreSystemDataObject;
  overlappende: MiniNettsperreSystemDataObject[];
};

type Overlappendesperring = {
  sperring: NettsperreSystemDataObject;
  overlapping: NettsperreSystemDataObject[];
};

const nettsperreGroups: string[] = ["NETTSPERRE-EKSAMEN-MAN"];

export const nettsperreHarNettsperre: TestCase = {
  id: "nettsperre_har_nettsperre",
  title: "Brukeren har aktiv nettsperre",
  description: "Sjekker om brukeren har aktiv nettsperre",
  waitForAllData: true,
  test: (user: TestUser, systemData: SystemData | undefined, allData: AllSystemData) => {
    if (!allData.azure) {
      return error({ message: `Mangler data i ${systemNames.azure}`, raw: { user }, solution: `Rettes i ${systemNames.azure}` });
    }

    if (!systemData) {
      return warn({ message: `Mangler data i ${systemNames.nettsperre}`, solution: `Meld sak en plass` });
    }

    const nettsperreData: NettsperreSystemData = getSystemData<NettsperreSystemData>(systemData);
    if (isFailedSystemData(allData.azure)) {
      return error({ message: `Feilet ved henting av data fra ${systemNames.azure}`, raw: { user }, solution: `Sjekk feilmelding i ${systemNames.azure}` });
    }

    const azureData: AzureSystemData = getSystemData<AzureSystemData>(allData.azure);
    const memberOfNettsperreGroups: (string | null | undefined)[] = azureData.memberOf.filter((group: string | null | undefined) => group && nettsperreGroups.includes(group));

    const isInNettsperreGroup: boolean = memberOfNettsperreGroups.length > 0;

    const data = {
      isInNettsperreGroup,
      hasActiveNettsperre: nettsperreData.activeNettsperrer.length > 0,
      activeNettsperrer: nettsperreData.activeNettsperrer
    };

    if (data.hasActiveNettsperre && !data.isInNettsperreGroup) {
      return error({ message: `Brukeren skal ha nettsperre, men ligger ikke i nettsperre-gruppe i ${systemNames.azure} 💀`, raw: data, solution: "Her har det skjedd noe galt - spør i vaktrommet" });
    }

    if (!data.hasActiveNettsperre && data.isInNettsperreGroup) {
      return error({
        message: `Brukeren har ingen aktive nettsperrer, men ligger i nettsperre-gruppe i ${systemNames.azure}`,
        raw: data,
        solution: `Mulig brukeren har blitt lagt inn manuelt - brukeren må fjernes manuelt fra grupper: ${memberOfNettsperreGroups.join(", ")}`
      });
    }

    if (!data.hasActiveNettsperre && !data.isInNettsperreGroup) {
      return success({ message: "Brukeren har ingen aktive nettsperrer" });
    }

    if (data.activeNettsperrer.length === 1) {
      const blockedGroup: string = data.activeNettsperrer[0].blockedGroup;
      const blockedByTeacher: string = data.activeNettsperrer[0].teacher;
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
};

export const nettsperrePending: TestCase = {
  id: "nettsperre_pending",
  title: "Brukeren har planlagte nettsperrer",
  description: "Sjekker om brukeren har planlagte nettsperrer",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return warn({ message: `Mangler data i ${systemNames.nettsperre}`, solution: `Meld sak en plass` });
    }

    const nettsperreData: NettsperreSystemData = getSystemData<NettsperreSystemData>(systemData);
    if (nettsperreData.futureNettsperrer.length === 0) {
      return ignore();
    }

    if (nettsperreData.futureNettsperrer.length > 0) {
      return success({
        message: `Brukeren har ${nettsperreData.futureNettsperrer.length} ${pluralizeText("planlagt", nettsperreData.futureNettsperrer.length, "e")} ${pluralizeText("nettsperre", nettsperreData.futureNettsperrer.length, "r")}`,
        raw: nettsperreData.futureNettsperrer
      });
    }

    return success({ message: "Brukere har ingen planlagte nettsperrer", raw: nettsperreData });
  }
};

export const nettsperreOverlappende: TestCase = {
  id: "nettsperre_overlappende",
  title: "Brukeren har overlappende nettsperrer",
  description: "Sjekker om brukeren har overlappende nettsperrer",
  waitForAllData: false,
  test: (_user: TestUser, systemData: SystemData | undefined) => {
    if (!systemData) {
      return warn({ message: `Mangler data i ${systemNames.nettsperre}`, solution: `Meld sak en plass` });
    }

    const nettsperreData: NettsperreSystemData = getSystemData<NettsperreSystemData>(systemData);
    const allNettsperrer: NettsperreSystemDataObject[] = [...nettsperreData.activeNettsperrer, ...nettsperreData.futureNettsperrer];

    const overlappendeSperringer: Overlappendesperring[] = [];
    for (const sperring of allNettsperrer) {
      const startTime: Date = new Date(sperring.startBlock);
      const endTime: Date = new Date(sperring.endBlock);
      const overlapping: NettsperreSystemDataObject[] = allNettsperrer
        .filter((sperre: NettsperreSystemDataObject) => sperre.id !== sperring.id)
        .filter((sperre: NettsperreSystemDataObject) => {
          const currentSperreStartTime: Date = new Date(sperre.endBlock);
          return currentSperreStartTime >= startTime && currentSperreStartTime <= endTime;
        });

      if (overlapping.length > 0) {
        overlappendeSperringer.push({
          sperring,
          overlapping
        });
      }
    }

    const repackOverlappendeSperring = (sperre: NettsperreSystemDataObject): MiniNettsperreSystemDataObject => {
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

    const repackedOverlappendeSperringer: MiniOverlappendesperring[] = overlappendeSperringer.map((sperring: Overlappendesperring) => {
      const currentSperring: MiniNettsperreSystemDataObject = repackOverlappendeSperring(sperring.sperring);
      const overlappende: MiniNettsperreSystemDataObject[] = sperring.overlapping.map((sperre: NettsperreSystemDataObject) => repackOverlappendeSperring(sperre));
      return {
        sperring: currentSperring,
        overlappende
      };
    });

    if (overlappendeSperringer.length === 0) {
      return ignore();
    }

    if (overlappendeSperringer.length > 0) {
      return warn({
        message: `Brukeren har ${repackedOverlappendeSperringer.length} overlappende ${pluralizeText("nettsperr", repackedOverlappendeSperringer.length, "inger", "e")} - dette kan by på problemer...`,
        raw: repackedOverlappendeSperringer,
        solution: "Sjekk rawdata og be aktuelle lærere sjekke at de har satt sperringen sin på korrekt tidspunkt"
      });
    }

    return ignore();
  }
};
