import type { InfoSystemData } from "../../types/system-data.js";
import type { TestUser } from "../../types/system-tests.js";

export const getData = async (_user: TestUser): Promise<InfoSystemData> => {
  return {
    info: "Denne blokka er bare til info den"
  };
};
