const parseDate = (date: unknown): Date | null => {
  try {
    const parsed: Date = new Date(date as string | number | Date);

    if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

/** Validerer at en dato er innenfor en start- og sluttdato. */
const isWithinDateRange = (startDate: unknown, endDate: unknown, now?: Date): boolean => {
  const start: Date | null = parseDate(startDate);
  const end: Date | null = parseDate(endDate);

  if (!start && !end) {
    return false;
  }

  const nowDate: Date = now ?? new Date();

  if (start && end) {
    return nowDate.getTime() > start.getTime() && nowDate.getTime() < end.getTime();
  }

  if (!start && end) {
    return nowDate.getTime() < end.getTime();
  }

  if (start && !end) {
    return nowDate.getTime() > start.getTime();
  }

  return false;
};

export default isWithinDateRange;
