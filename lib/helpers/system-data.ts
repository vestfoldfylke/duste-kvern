import type { SystemData } from "../../types/system-data.js";

export const getSystemData = <T>(systemData: SystemData): T => {
  return systemData as T;
};
