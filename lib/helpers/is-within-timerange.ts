type TimeRangeResult = {
  result: boolean;
  seconds: number;
};

export const isWithinTimeRange = (one: Date, two: Date, seconds = 15): TimeRangeResult => {
  if (one.toString() === "Invalid Date" || two.toString() === "Invalid Date") {
    return {
      result: false,
      seconds: -1
    };
  }

  if (seconds < 0) seconds = -seconds;

  const diff = (two.getTime() - one.getTime()) / 1000;
  return {
    result: diff <= seconds && diff >= -seconds,
    seconds: diff
  };
};
