import type { TestResult } from "../lib/test-result.js";
import type { AllSystemData, SystemData } from "./system-data.js";

export type Report = {
  instanceId: string;
  createdTimestamp: string;
  startedTimestamp: string | null;
  running: boolean;
  queued: boolean | null;
  ready: boolean;
  finishedTimestamp: string | null;
  serverRuntime: number | null;
  totalRuntime: number | null;
  user: TestUser;
  caller: {
    upn: string;
    oid: string;
  };
  systems: SystemWithTestsResult[];
};

export type ReportWithId = Report & {
  _id: string;
};

export type SystemWithTestsAndData = {
  id: "ad" | "azure" | "fint-ansatt" | "fint-elev" | "fint-larer" | "info" | "nettsperre" | "sync" | "feide";
  name: string;
  description: string | null;
  failed?: boolean;
  startedTimestamp?: string;
  finishedTimestamp?: string | null;
  runtime?: number | null;
  tests: TestCase[];
  data?: SystemData | null;
};

export type SystemWithTestsResult = Omit<SystemWithTestsAndData, "tests"> & {
  tests: TestCaseResult[];
};

export type TestUser = {
  id: string;
  accountEnabled: boolean;
  displayName: string;
  givenName?: string;
  surname?: string;
  userPrincipalName: string;
  jobTitle?: string;
  state?: string;
  department?: string;
  companyName?: string;
  onPremisesSamAccountName?: string;
  onPremisesExtensionAttributes?: {
    extensionAttribute1: string | null;
    extensionAttribute2: string | null;
    extensionAttribute3: string | null;
    extensionAttribute4: string | null;
    extensionAttribute5: string | null;
    extensionAttribute6: string | null;
    extensionAttribute7: string | null;
    extensionAttribute8: string | null;
    extensionAttribute9: string | null;
    extensionAttribute10: string | null;
    extensionAttribute11: string | null;
    extensionAttribute12: string | null;
    extensionAttribute13: string | null;
    extensionAttribute14: string | null;
    extensionAttribute15: string | null;
  };
  userType: "ansatt" | "elev" | "otElev" | "larling" | "slettaElev";
  isTeacher?: boolean;
  feidenavn?: string;
  samAccountName?: string;
  employeeNumber?: string;
  displayNameLowerCase?: string;
  surNameLowerCase?: string;
  updatedAt?: string;
  extraCaution?: boolean;
};

export type TestCase = {
  id: string;
  title: string;
  description: string;
  waitForAllData: boolean;
  test: (user: TestUser, systemData: SystemData | undefined, allData: AllSystemData) => TestResult;
  result?: TestResult | null;
  mappedTestFunction?: (user: TestUser, systemData: SystemData | null | undefined, allData?: AllSystemData) => void;
};

export type TestCaseResult = Omit<TestCase, "test" | "mappedTestFunction">;

export type SystemTests = {
  id: string;
  tests: TestCase[];
};

export type UserTests = {
  systemsOverview: SystemWithTestsResult[];
  systemsToHandle: SystemTests[];
};
