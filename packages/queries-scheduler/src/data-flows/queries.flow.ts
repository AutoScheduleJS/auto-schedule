import {
  IQueryInternal,
  ITimeBoundary,
  ITimeDurationInternal,
  ITimeRestriction,
  RestrictionCondition,
} from '@autoschedule/queries-fn';
import { complement, intersect, unify } from 'intervals-fn';
import * as moment from 'moment';
import * as R from 'ramda';

import { IConfig } from '../data-structures/config.interface';
import { IMaterial } from '../data-structures/material.interface';
import { IPotentiality } from '../data-structures/potentiality.interface';
import { IRange } from '../data-structures/range.interface';

type IQuery = IQueryInternal;
type maskFn = (tm: IRange) => IRange[];
type mapRange = (r: IRange[], tm: IRange) => IRange[];
// type toNumber = (o: any) => number;
type toTBToNumber = (t: keyof ITimeBoundary) => (o: any) => number;
type getFirstFn = (rest: IRange) => IRange;
type unfoldRange = (seed: IRange) => false | [IRange, IRange];
// type toTimeDur = (o: any) => ITimeDurationInternal;

export const mapToMonthRange = (restricts: IRange[], mask: IRange): IRange[] => {
  const end = +moment(mask.end).endOf('day');
  return restrictsToRanges(getFirstMonthRange(mask), rangesUnfolder(end, 'year'), restricts);
};

const getFirstMonthRange = R.curry((mask: IRange, restrict: IRange): IRange => {
  const startOfYear = +moment(mask.start).startOf('year');
  const start = +addDecimalMonthTo(startOfYear, restrict.start);
  const end = +addDecimalMonthTo(startOfYear, restrict.end);
  return { start, end };
});

export const mapToWeekdayRange = (restricts: IRange[], mask: IRange): IRange[] => {
  const end = +moment(mask.end).endOf('day');
  return restrictsToRanges(getFirstWeekdayRange(mask), rangesUnfolder(end, 'week'), restricts);
};

const getFirstWeekdayRange = R.curry((mask: IRange, restrict: IRange): IRange => {
  const startOfWeek = +moment(mask.start).startOf('week');
  const start = +addDecimalDayTo(startOfWeek, restrict.start);
  const end = +addDecimalDayTo(startOfWeek, restrict.end);
  return { start, end };
});

export const mapToHourRange = (restricts: IRange[], mask: IRange): IRange[] => {
  const end = +moment(mask.end).endOf('day');
  return restrictsToRanges(getFirstHourRange(mask), rangesUnfolder(end, 'day'), restricts);
};

export const mapToTimeRestriction = (tr: ITimeRestriction | undefined, mapFn: mapRange) => (
  masks: IRange[]
): IRange[] => {
  return tr == null ? masks : R.unnest(masks.map(getMaskFilterFn(tr, mapFn)));
};

const restrictsToRanges = (getFirst: getFirstFn, unfoldFn: unfoldRange, restricts: IRange[]) => {
  return R.unnest(restricts.map(R.pipe(getFirst, R.unfold(unfoldFn))));
};

const addDecimalDayTo = (date: number, days: number) =>
  moment(date)
    .add(Math.floor(days), 'day')
    .add((days % 1) * 24, 'hour');

const addDecimalMonthTo = (date: number, month: number) => {
  const mDate = moment(date).add(Math.floor(month), 'month');
  return mDate.add((month % 1) * mDate.daysInMonth(), 'day');
};

const addToTimestamp = (
  nb: moment.DurationInputArg1,
  kind: moment.unitOfTime.DurationConstructor
) => (ts: number) => +moment(ts).add(nb, kind);

const rangesUnfolder = (end: number, kind: moment.unitOfTime.DurationConstructor) => (
  range: IRange
): false | [IRange, IRange] => {
  if (range.start >= end) {
    return false;
  }
  const nextRange = R.map(addToTimestamp(1, kind), range);
  return [range, nextRange];
};

const getFirstHourRange = R.curry((mask: IRange, restrict: IRange): IRange => {
  const start = +moment(mask.start)
    .startOf('day')
    .add(restrict.start, 'hour');
  const end = +moment(mask.start)
    .startOf('day')
    .add(restrict.end, 'hour');
  return { start, end };
});

const getMaskFilterFn = (tr: ITimeRestriction, mapFn: mapRange): maskFn => {
  return R.converge(
    (ranges: IRange[], mask: IRange) =>
      tr.condition === RestrictionCondition.InRange ? ranges : complement(mask, ranges),
    [
      R.converge(intersect, [
        R.partial(mapFn, [tr.ranges.map(r => ({ start: r[0], end: r[1] }))]),
        R.identity,
      ]),
      R.identity,
    ]
  );
};
const ifThen = <T, K>(cond: (a: T) => boolean) => (thenVal: (a: T) => K, elseVal: (a: T) => K) => (
  val: T
) => (cond(val) ? thenVal(val) : elseVal(val));
const ifHasStart = ifThen((q: IQuery) => q.position.start != null);
const ifHasEnd = ifThen((q: IQuery) => q.position.end != null);
// const queryIsSplittable = (query: IQuery) => !!query.splittable;
const qStart: toTBToNumber = (t: keyof ITimeBoundary) => R.pathOr(0, ['position', 'start', t]);
const qEnd: toTBToNumber = (t: keyof ITimeBoundary) => R.pathOr(0, ['position', 'end', t]);
// const gQuantityTarget: toNumber = R.pipe(gQuantity, R.pathOr(1, ['target']) as toNumber);

// const atomicToDurationNb = (tStart: keyof ITimeBoundary, tEnd: keyof ITimeBoundary) =>
//   R.converge(R.subtract, [qEnd(tEnd), qStart(tStart)]);

const atomicToDuration = (q: IQuery) => q.position.duration;

/**
 * TODO: sanitize queries -> all timeBoundary's fields are mandatory
 */
const shiftWithTimeBoundary = (shift: ITimeBoundary, origin: number) => ({
  max: shift.max ? origin + shift.max : origin,
  min: shift.min ? origin + shift.min : origin,
  target: shift.target ? origin + shift.target : origin,
});

export const linkToMask = (materials: ReadonlyArray<IMaterial>, config: IConfig) => (
  query: IQuery
): ReadonlyArray<IRange> => {
  if (!query.links) {
    return [{ end: config.endDate, start: config.startDate }];
  }
  return query.links
    .map(link => {
      return materials
        .filter(
          range =>
            range.queryId === link.queryId &&
            range.materialId === link.potentialId &&
            range.splitId === link.splitId
        )
        .map(target => {
          const duration = atomicToDuration(query);
          const start = shiftWithTimeBoundary(link.distance, target[link.origin]);
          return [{ start: start.min, end: start.max + duration.target }];
        })
        .reduce((a, b) => unify(a, b), []);
    })
    .reduce((a, b) => intersect(a, b));
};

const atomicToChildren = (c: IConfig) =>
  R.applySpec<IRange>({
    end: ifHasEnd(qEnd('target'), R.always(c.endDate)),
    start: ifHasStart(qStart('target'), R.always(c.startDate)),
  });

export const atomicToPotentiality = (config: IConfig) => (query: IQuery): IPotentiality[] => {
  const duration = atomicToDuration(query) as ITimeDurationInternal;
  const place = atomicToChildren(config)(query);
  const queryId = query.id;
  return [
    { isSplittable: false, places: [place], duration, queryId, pressure: -1, potentialId: 0 },
  ];
};
