export const asymptotTo = (limit: number) => (value: number) => value / (value + 1) * limit;

export const mean = (...list: number[]) => list.reduce((a, b) => a + b) / list.length;

export const fillLimitedArray = <T>(limit: number) => (arr: T[], value: T): T[] => {
  return arr.length < limit ? [...arr, value] : [...arr.slice(0, -1), value];
};

export const areSameNumber = (minDiff: number) => (avg1: number, avg2: number): boolean => {
  return Object.is(avg1, avg2) || Math.abs(avg1 - avg2) < minDiff;
};

export const propOrDefault = <K>(
  defaultValue: K[keyof K],
  obj: K | undefined,
  propToCheck: Array<keyof K>
): K[keyof K] => {
  if (obj == null) {
    return defaultValue;
  }
  const resultProp = propToCheck.find(prop => obj[prop] != null);
  return resultProp ? obj[resultProp] : defaultValue;
};

export const maxBy = <T>(by: (a: T) => number) => (first: T, second: T): T => {
  return by(first) > by(second) ? first : second;
};

export const getProp = <T>(prop: keyof T) => (obj: T): T[keyof T] => obj[prop];

export const getMax = <T>(prop: keyof T, list: ReadonlyArray<T>): T => {
  if (!list.length) {
    throw new Error('getMax of empty list');
  }
  if (typeof getProp(prop)(list[0]) !== 'number') {
    throw new Error(`${list[0]}.${prop} is not a number`);
  }
  return list.reduce(maxBy(getProp(prop) as (o: T) => any));
}
