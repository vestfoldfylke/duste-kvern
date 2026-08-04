export const hasData = (obj: unknown): boolean =>
  obj !== null ? (Array.isArray(obj) ? obj.length > 0 : typeof obj === "object" ? Object.getOwnPropertyNames(obj).filter((prop) => prop !== "length").length > 0 : typeof obj !== "undefined") : false;

export const getArray = <T>(obj: T | T[]): T[] => (Array.isArray(obj) ? obj : [obj]).filter((o) => !!o);

export const getArrayData = <T>(data: T | T[]): T => getArray(data)[0];
