import { assoc, assocPath, mergeAll } from 'ramda';
import {
  GoalKind,
  IGoal,
  IQuery,
  ITimeBoundary,
  ITimeDuration,
  ITimeRestrictions,
  QueryKind,
  RestrictionCondition,
} from './data.structures';
export * from './data.structures';

export const name = (nameStr?: string): Record<'name', string> => ({ name: nameStr || 'query' });
export const kind = (kindQK?: QueryKind): Record<'kind', QueryKind> => ({
  kind: kindQK != null ? kindQK : QueryKind.Atomic,
});
export const id = (idNb?: number): Record<'id', number> => ({ id: idNb || 42 });
const tb = <T extends 'start' | 'end'>(t: T) => (
  target: number,
  minTime?: number
): Record<T, ITimeBoundary> => {
  const min = minTime || target;
  return assoc(
    t,
    {
      max: target,
      min,
      target,
    },
    {}
  );
};
export const start = tb('start');
export const end = tb('end');
export const timeDuration = (target: number, minTime?: number): ITimeDuration => {
  const min = minTime || target;
  return { min, target };
};
export const duration = (dur: ITimeDuration): Record<'duration', ITimeDuration> => {
  return assoc('duration', dur, {});
};
export const timeRestriction = (
  condition: RestrictionCondition,
  ranges: ReadonlyArray<[number, number]>
) => {
  return {
    condition,
    ranges,
  };
};
export const timeRestrictions = (
  type: keyof ITimeRestrictions,
  condition: RestrictionCondition,
  ranges: ReadonlyArray<[number, number]>
) =>
  assocPath(['timeRestrictions', type], timeRestriction(condition, ranges), {}) as Record<
    'timeRestrictions',
    ITimeRestrictions
  >;
export const goal = (
  kindEn: GoalKind,
  quantity: ITimeDuration,
  time: number
): Record<'goal', IGoal> => ({
  goal: { kind: kindEn, quantity, time },
});
export const queryFactory = (...factories: Array<Partial<IQuery>>): IQuery => {
  return mergeAll([id(), name(), kind(), ...factories]) as IQuery;
};
