const padDate = (num: number): string => {
  return num >= 10 ? String(num) : `0${num}`;
};

export const prettifyDateToLocaleString = (date: Date, dateOnly = false): string => {
  let myDate: string | undefined;

  if (date instanceof Date) {
    myDate = date.toLocaleString("no-NO", {
      timeZone: "Europe/Oslo",
      hour12: false,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  if (!myDate) return "";

  myDate = myDate.replace(",", "");

  if (myDate.includes("/")) {
    const split = myDate.split("/");
    return `${split[1]}.${split[0]}.${split[2]}`;
  }

  return !dateOnly
    ? myDate
    : date.toLocaleString("no-NO", {
        timeZone: "Europe/Oslo",
        hour12: false,
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
};

export const entraIdDate = (date: Date = new Date()): string => {
  return `${date.getFullYear()}-${padDate(date.getMonth() + 1)}-${padDate(date.getDate())}`;
};
