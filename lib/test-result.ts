type ResultStatus = "ok" | "warning" | "error" | "ignore" | "no-data";

type ResultOptions = {
  message: string;
  solution?: string;
  raw?: unknown;
  status?: ResultStatus;
};

type TestResult = {
  status: ResultStatus;
  message: string;
  solution?: string;
  raw?: unknown;
};

const getResultObject = (options: ResultOptions, status: ResultStatus): TestResult => {
  if (!options.message) {
    throw new Error('Property "message" is required in all result types');
  }

  const result: TestResult = {
    status,
    message: options.message
  };

  if (options.solution) {
    result.solution = options.solution;
  }

  if (options.raw !== undefined) {
    result.raw = options.raw;
  }

  return result;
};

export const success = (result: ResultOptions): TestResult => getResultObject(result, "ok");

export const warn = (result: ResultOptions): TestResult => getResultObject(result, "warning");

export const error = (result: ResultOptions): TestResult => getResultObject(result, "error");

export const ignore = (): TestResult => getResultObject({ message: "irrelevant" }, "ignore");

export const noData = (message?: string): TestResult => getResultObject({ message: message || "Mangler data..." }, "no-data");
