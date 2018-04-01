// import { assoc, assocPath, mergeAll } from 'ramda';
import * as client from './client.structures';
import * as internal from './internal.structures';

/**
 * Construct query's `name` property.
 * @param nameStr if not set, use `'query'`.
 */
export const name = (nameStr?: string): Record<'name', string> => ({ name: nameStr || 'query' });

/**
 * Construct query's `kind` property.
 * @param kindQK if not set, use `Atomic` kind.
 */
export const kind = (kindQK?: client.QueryKind): Record<'kind', client.QueryKind> => ({
  kind: kindQK != null ? kindQK : client.QueryKind.Atomic,
});

/**
 * Construct query's `id` property.
 * @param idNb if not set, use `42`.
 */
export const id = (idNb?: number): Record<'id', number> => ({ id: idNb || 42 });

const isStartEndPosition = (pos: client.IQueryPosition): pos is client.IQueryPositionStartEnd => {
  return (
    (pos as client.IQueryPositionDuration).duration == null &&
    (pos as client.IQueryPositionStartEnd).start != null &&
    (pos as client.IQueryPositionStartEnd).end != null
  );
};

const isDurationPosition = (pos: client.IQueryPosition): pos is client.IQueryPositionDuration => {
  return (pos as client.IQueryPositionDuration).duration != null;
};

const isStartTimeTargetTimeBoundary = (
  timeBoundary: client.IStartTimeBoundary
): timeBoundary is client.ITimeTargetBoundary => {
  return (timeBoundary as client.ITimeTargetBoundary).target != null;
};

const isEndTimeTargetTimeBoundary = (
  timeBoundary: client.IEndTimeBoundary
): timeBoundary is client.ITimeTargetBoundary => {
  return (timeBoundary as client.ITimeTargetBoundary).target != null;
};

export const position = (
  posi: client.IQueryPosition
): Record<'position', internal.IQueryPosition> => {
  const pos: client.IQueryPosition = deleteOptionalProperties(posi as any, [
    'start',
    'end',
    'duration',
  ]);
  if (isDurationPosition(pos)) {
    const min = pos.duration.min
      ? pos.duration.min
      : pos.start && pos.start.max && pos.end && pos.end.min
        ? pos.end.min - pos.start.max
        : pos.duration.target;
    return {
      position: {
        ...pos,
        duration: {
          min,
          target: pos.duration.target,
        },
      },
    };
  } else if (isStartEndPosition(pos)) {
    const endMin = isEndTimeTargetTimeBoundary(pos.end) ? pos.end.target : pos.end.min;
    const startMax = isStartTimeTargetTimeBoundary(pos.start) ? pos.start.target : pos.start.max;
    const dur: internal.ITimeDuration = {
      min: (pos.end.min || endMin) - (pos.start.max || startMax),
      target: endMin - startMax,
    };
    return { position: { ...pos, duration: dur } };
  }
  throw new Error('Invalid position');
};

export const queryLink = (
  distance: client.ITimeBoundary,
  origin: 'start' | 'end',
  queryId: client.QueryID,
  potentialId: number,
  splitId?: number
): internal.IQueryLink => ({
  distance,
  origin,
  potentialId,
  queryId,
  splitId,
});

export const links = (
  queryLinks: internal.IQueryLink[]
): Record<'links', ReadonlyArray<internal.IQueryLink>> | {} => {
  if (!queryLinks || !queryLinks.length) {
    return {};
  }
  return { links: queryLinks };
};

/**
 * Construct a `timeRestriction`
 */
export const timeRestriction = (
  condition: client.RestrictionCondition,
  ranges: ReadonlyArray<[number, number]>
) => {
  return {
    condition,
    ranges,
  };
};

/* tslint:disable:no-object-literal-type-assertion */
/**
 * Construct query's `timeRestrictions` property
 */
export const timeRestrictionsHelper = (
  type: keyof client.ITimeRestrictions,
  condition: client.RestrictionCondition,
  ranges: ReadonlyArray<[number, number]>
) =>
  ({ timeRestrictions: { [type]: timeRestriction(condition, ranges) } } as Record<
    'timeRestrictions',
    internal.ITimeRestrictions
  >);
/* tslint:enable */

export const timeRestrictions = (
  restric: client.ITimeRestrictions
): Record<'timeRestrictions', internal.ITimeRestrictions> | {} => {
  if (restric == null || (!restric.hour && !restric.month && !restric.weekday)) {
    return {};
  }
  return {
    timeRestrictions: deleteOptionalProperties(restric, ['hour', 'month', 'weekday']),
  };
};

/**
 * Construct a `taskTransformNeed`
 */
export const need = (
  wait: boolean = false,
  collectionName: string = 'test',
  find: any = {},
  quantity: number = 1,
  ref: string = '1'
): internal.ITaskTransformNeed => {
  return {
    collectionName,
    find,
    quantity,
    ref,
    wait,
  };
};

/**
 * Construct query's `transforms` property
 */
export const transformsHelper = (
  needs: ReadonlyArray<internal.ITaskTransformNeed>,
  updates: ReadonlyArray<internal.ITaskTransformUpdate>,
  inserts: ReadonlyArray<internal.ITaskTransformInsert>
): Record<'transforms', internal.IQueryTransformation> => ({
  transforms: {
    deletes: needs.filter(n => updates.every(update => update.ref !== n.ref)).map(n => n.ref),
    inserts,
    needs,
    updates,
  },
});

export const transforms = (
  transfos: client.IQueryTransformation
): Record<'transforms', internal.IQueryTransformation> | {} => {
  if (!transfos || (!transfos.inserts && !transfos.needs && !transfos.updates)) {
    return {};
  }
  return transformsHelper(
    (transfos.needs || []).filter(isTaskTransformNeed),
    (transfos.updates || []).filter(isTaskTransformUpdate),
    (transfos.inserts || []).filter(isTaskTransformInsert)
  );
};

/* tslint:disable:no-object-literal-type-assertion */
/**
 * Merge all partials queries to form one query. Provide default `id`, `name` and `kind` (`IBaseQuery` properties)
 * @param factories Partial query objects resulting from factories functions
 * @returns Query object built from merging all partials
 */
export const queryFactory = (...factories: Array<Partial<internal.IQuery>>): internal.IQuery => {
  return {
    ...id(),
    ...name(),
    ...kind(),
    ...position({ duration: { target: 2 } }),
    ...factories.reduce((a, b) => ({ ...a, ...b }), {}),
  } as internal.IQuery;
};
/* tslint:enable */
/* tslint:disable:prefer-object-spread */
const deleteOptionalProperties = <T extends {}>(obj: T, optionalProps: Array<keyof T>): T => {
  const result = Object.assign({}, obj);
  optionalProps.forEach(prop => {
    if (result[prop] != null) {
      return;
    }
    delete result[prop];
  });
  return result;
};
/* tslint:enable */
export const sanitize = (query: any): internal.IQuery => {
  return queryFactory(
    id(query.id),
    name(query.name),
    kind(query.kind),
    position(query.position),
    links(query.links),
    timeRestrictions(query.timeRestrictions),
    transforms(query.transforms)
  );
};

export const isTaskTransformNeed = (userNeed: any): userNeed is internal.ITaskTransformNeed => {
  return (
    userNeed != null &&
    userNeed.collectionName != null &&
    userNeed.find != null &&
    userNeed.quantity != null &&
    userNeed.ref != null
  );
};

export const isTaskTransformInsert = (
  userInsert: any
): userInsert is internal.ITaskTransformInsert => {
  return userInsert != null && userInsert.collectionName != null && userInsert.doc != null;
};

export const isTaskTransformUpdate = (
  userUpdate: any
): userUpdate is internal.ITaskTransformUpdate => {
  return userUpdate != null && userUpdate.ref != null && userUpdate.update != null;
};
