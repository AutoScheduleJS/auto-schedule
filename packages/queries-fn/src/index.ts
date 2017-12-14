import { assoc, assocPath, mergeAll } from 'ramda';
import {
  GoalKind,
  IAtomicQuery,
  IGoal,
  IGoalQuery,
  IProviderQuery,
  ITimeBoundary,
  ITimeDuration,
  ITimeRestrictions,
  QueryKind,
  RestrictionCondition,
} from './data.structures';

export * from './data.structures';

export type IQuery = IAtomicQuery | IGoalQuery | IProviderQuery;

/**
 * Construct query's `name` property.
 * @param nameStr if not set, use `'query'`.
 */
export const name = (nameStr?: string): Record<'name', string> => ({ name: nameStr || 'query' });

/**
 * Construct query's `kind` property.
 * @param kindQK if not set, use `Atomic` kind.
 */
export const kind = (kindQK?: QueryKind): Record<'kind', QueryKind> => ({
  kind: kindQK != null ? kindQK : QueryKind.Atomic,
});

/**
 * Construct query's `id` property.
 * @param idNb if not set, use `42`.
 */
export const id = (idNb?: number): Record<'id', number> => ({ id: idNb || 42 });

/**
 * Construct query's `provide` property.
 */
export const provide = (provideNb: number): Record<'provide', number> => ({ provide: provideNb });

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

/**
 * Construct query's `start` property. Max set to `target`
 * @param target: target time
 * @param minTime: minimal time. If not provided, use `target` duration
 */
export const start = tb('start');

/**
 * Construct query's `end` property. Max set to `target`
 * @param target: target time
 * @param minTime: minimal time. If not provided, use `target` duration
 */
export const end = tb('end');
/**
 * Construct `timeDuration` object.
 * @param target target duration
 * @param minTime minimal duration. If not provided, use `target` duration.
 */
export const timeDuration = (target: number, minTime?: number): ITimeDuration => {
  const min = minTime || target;
  return { min, target };
};

/**
 * Construct query's `duration` property
 * @param dur use `timeDuration` function
 */
export const duration = (dur: ITimeDuration): Record<'duration', ITimeDuration> => {
  return assoc('duration', dur, {});
};

/**
 * Construct a `timeRestriction`
 */
export const timeRestriction = (
  condition: RestrictionCondition,
  ranges: ReadonlyArray<[number, number]>
) => {
  return {
    condition,
    ranges,
  };
};

/**
 * Construct query's `timeRestrictions` property
 */
export const timeRestrictions = (
  type: keyof ITimeRestrictions,
  condition: RestrictionCondition,
  ranges: ReadonlyArray<[number, number]>
) =>
  assocPath(['timeRestrictions', type], timeRestriction(condition, ranges), {}) as Record<
    'timeRestrictions',
    ITimeRestrictions
  >;

/**
 * Construct query's `goal` property
 */
export const goal = (
  kindEn: GoalKind,
  quantity: ITimeDuration,
  time: number
): Record<'goal', IGoal> => ({
  goal: { kind: kindEn, quantity, time },
});

/**
 * Merge all partials queries to form one query. Provide default `id`, `name` and `kind` (`IBaseQuery` properties)
 * @param factories Partial query objects resulting from factories functions
 * @returns Query object built from merging all partials
 */
export const queryFactory = <T extends IQuery>(...factories: Array<Partial<T>>): T => {
  return mergeAll([id(), name(), kind(), ...factories]) as T;
};

export const isGoalQuery = (query: IQuery): query is IGoalQuery => {
  return (query as IGoalQuery).goal != null;
}

export const isProviderQuery = (query: IQuery): query is IProviderQuery => {
  return (query as IProviderQuery).provide != null;
}

export const isAtomicQuery = (query: IQuery): query is IAtomicQuery => {
  return !isGoalQuery(query) && !isProviderQuery(query)
}
