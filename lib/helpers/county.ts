import { COUNTY_OU } from "../../config.js";

export const isTelemark = (): boolean => COUNTY_OU === "TFYLKE";
export const isVestfold = (): boolean => COUNTY_OU === "VFYLKE";
