import type { AllSystemData, SystemData } from "./system-data.js";
import type { TestUser } from "./system-tests.js";

export type GetData = (user: TestUser) => Promise<SystemData | null>;

export type SystemInWorkerResponse = AllSystemData;
