export type ValidationResult = {
  valid: boolean;
  type?: "Fødselsnummer" | "D-nummer" | "VIGO-nummer";
  error?: string;
};

const validateDate = (digits: string): boolean => {
  const day: string = digits.substring(0, 2);
  const month: string = digits.substring(2, 4);
  const year: string = digits.substring(4, 6);

  const date: Date = new Date(Number.parseInt(year === "00" ? "2000" : year, 10), Number.parseInt(month, 10) - 1, Number.parseInt(day, 10));
  return date && date.getMonth() + 1 === Number.parseInt(month, 10) && date.getDate() === Number.parseInt(day, 10);
};

const validateChecksum = (digits: string): boolean => {
  const d: number[] = digits.split("").map((c: string) => Number.parseInt(c, 10));
  let k1: number = 11 - ((3 * d[0] + 7 * d[1] + 6 * d[2] + 1 * d[3] + 8 * d[4] + 9 * d[5] + 4 * d[6] + 5 * d[7] + 2 * d[8]) % 11);
  let k2: number = 11 - ((5 * d[0] + 4 * d[1] + 3 * d[2] + 2 * d[3] + 7 * d[4] + 6 * d[5] + 5 * d[6] + 4 * d[7] + 3 * d[8] + 2 * k1) % 11);

  if (k1 === 11) {
    k1 = 0;
  }
  if (k2 === 11) {
    k2 = 0;
  }

  return k1 < 10 && k2 < 10 && k1 === d[9] && k2 === d[10];
};

export const isValidFnr = (digits: string | null): ValidationResult => {
  if (digits?.length !== 11) {
    return { valid: false, error: "Fødselsnummeret har ugyldig lengde" };
  }

  const isDnr: boolean = Number.parseInt(digits.substring(0, 1), 10) > 3;
  const isVnr: boolean = isDnr && Number.parseInt(digits.substring(6, 8), 10) === 99;
  if (isVnr) {
    return { valid: true, type: "VIGO-nummer" };
  }

  const type: ValidationResult["type"] = isDnr ? "D-nummer" : "Fødselsnummer";

  const validDate: boolean = validateDate(isDnr ? `${Number.parseInt(digits.substring(0, 1), 10) - 4}${digits.substring(1)}` : digits);
  if (!validDate) {
    return { valid: false, error: `${type}et har ugyldig dato` };
  }

  const validChecksum: boolean = validateChecksum(digits);
  if (!validChecksum) {
    return { valid: false, error: `${type}et er ugyldig` };
  }

  return { valid: true, type };
};
