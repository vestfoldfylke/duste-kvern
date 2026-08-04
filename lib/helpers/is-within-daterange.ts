const parseDate = (date: unknown): Date | false => {
  try {
    const parsed = new Date(date as string | number | Date);

    if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) {
      return false;
    }

    return parsed;
  } catch {
    return false;
  }
};

const isWithinDaterange = (startDate: unknown, endDate: unknown, now?: Date): boolean => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!start && !end) {
    return false;
  }

  const nowDate = now ?? new Date();

  if (!start) {
    return nowDate.getTime() < (end as Date).getTime();
  }

  if (!end) {
    return nowDate.getTime() > start.getTime();
  }

  return nowDate.getTime() > start.getTime() && nowDate.getTime() < end.getTime();
};

export default isWithinDaterange;
