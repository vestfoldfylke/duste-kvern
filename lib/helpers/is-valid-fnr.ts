type ValidationResult = {
  valid: boolean;
  type?: "Fødselsnummer" | "D-nummer" | "VIGO-nummer";
  error?: string;
};

const validateDate = (digits: string): boolean => {
  const day = digits.substring(0, 2);
  const month = digits.substring(2, 4);
  const year = digits.substring(4, 6);

  const date = new Date(Number.parseInt(year === "00" ? "2000" : year, 10), Number.parseInt(month, 10) - 1, Number.parseInt(day, 10));
  return date && date.getMonth() + 1 === Number.parseInt(month, 10) && date.getDate() === Number.parseInt(day, 10);
};

const validateChecksum = (digits: string): boolean => {
  const d = digits.split("").map((c) => Number.parseInt(c, 10));
  let k1 = 11 - ((3 * d[0] + 7 * d[1] + 6 * d[2] + 1 * d[3] + 8 * d[4] + 9 * d[5] + 4 * d[6] + 5 * d[7] + 2 * d[8]) % 11);
  let k2 = 11 - ((5 * d[0] + 4 * d[1] + 3 * d[2] + 2 * d[3] + 7 * d[4] + 6 * d[5] + 5 * d[6] + 4 * d[7] + 3 * d[8] + 2 * k1) % 11);

  if (k1 === 11) k1 = 0;
  if (k2 === 11) k2 = 0;

  return k1 < 10 && k2 < 10 && k1 === d[9] && k2 === d[10];
};

export const isValidFnr = (digits: string): ValidationResult => {
  if (!digits || digits.length !== 11) {
    return { valid: false, error: "Fødselsnummeret har ugyldig lengde" };
  }

  const isDnr = Number.parseInt(digits.substring(0, 1), 10) > 3;
  const isVnr = isDnr && Number.parseInt(digits.substring(6, 8), 10) === 99;
  if (isVnr) {
    return { valid: true, type: "VIGO-nummer" };
  }

  const type = isDnr ? "D-nummer" : "Fødselsnummer";

  const validDate = validateDate(isDnr ? `${Number.parseInt(digits.substring(0, 1), 10) - 4}${digits.substring(1)}` : digits);
  if (!validDate) {
    return { valid: false, error: `${type}et har ugyldig dato` };
  }

  const validChecksum = validateChecksum(digits);
  if (!validChecksum) {
    return { valid: false, error: `${type}et er ugyldig` };
  }

  return { valid: true, type };
};
