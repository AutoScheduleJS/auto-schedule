import * as client from './client.structures';
import * as internal from './internal.structures';
export * from './client.structures';
export * from './internal.structures';

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
): Record<'position', internal.IQueryPositionInternal> => {
  const pos: client.IQueryPosition = deleteOptionalProperties(posi as any, [
    'start',
    'end',
    'duration',
  ]);
  if (isDurationPosition(pos)) {
    const min = pos.duration.min
      ? pos.duration.min
      : pos.start && pos.start.max && pos.end && pos.end.min
        ? Math.max(pos.end.min - pos.start.max, 0)
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
    const dur: internal.ITimeDurationInternal = {
      min: Math.max((pos.end.min || endMin) - (pos.start.max || startMax), 0),
      target: Math.max(endMin - startMax, 0),
    };
    return { position: { ...pos, duration: dur } };
  }
  throw new Error('Invalid position');
};

export const duration = (
  target: number,
  min?: number
): Record<'duration', client.ITimeDuration> => {
  return {
    duration: { target, min },
  };
};

export const durationInternal = (
  target: number,
  min?: number
): Record<'duration', internal.ITimeDurationInternal> => {
  return {
    duration: { target, min: min ? min : target },
  };
};

/* tslint:disable:no-object-literal-type-assertion */
const tb = <T extends 'start' | 'end'>(t: T) => (target?: number, min?: number, max?: number) => {
  return {
    [t]: { target, min, max },
  } as Record<T, client.ITimeBoundary>;
};
/* tslint:enable:no-object-literal-type-assertion */

export const start = tb('start');
export const end = tb('end');

/**
 * When using start/end with end.min < start.max, it is recommanded to define a minimal duration
 */
export const positionHelper = (
  ...factories: Array<Partial<client.IQueryPosition>>
): Record<'position', internal.IQueryPositionInternal> => {
  return position(factories.reduce((a, b) => ({ ...a, ...b }), {}) as client.IQueryPosition);
};

export const queryLink = (
  distance: client.ITimeBoundary,
  origin: 'start' | 'end',
  queryId: client.QueryID,
  potentialId: number,
  splitId?: number
): internal.IQueryLinkInternal => ({
  distance,
  origin,
  potentialId,
  queryId,
  splitId,
});

export const links = (
  queryLinks: internal.IQueryLinkInternal[]
): Record<'links', ReadonlyArray<internal.IQueryLinkInternal>> | {} => {
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
    client.ITimeRestrictions
  >);
/* tslint:enable */

export const timeRestrictions = (
  restric: client.ITimeRestrictions
): Record<'timeRestrictions', client.ITimeRestrictions> | {} => {
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
): client.ITaskTransformNeed => {
  return {
    collectionName,
    find,
    quantity,
    ref,
    wait,
  };
};

const defaultQuantityToOne = (
  insert: { quantity?: number, [key:string]: any }
): any => {
  return {
    ...insert,
    quantity: insert.quantity != null ? insert.quantity : 1,
  };
};

/**
 * Construct query's `transforms` property
 */
export const transformsHelper = (
  needs: ReadonlyArray<client.ITaskTransformNeed>,
  updates: ReadonlyArray<client.ITaskTransformUpdate>,
  inserts: ReadonlyArray<client.ITaskTransformInsert>
): Record<'transforms', internal.IQueryTransformationInternal> => ({
  transforms: {
    deletes: needs.filter(n => updates.every(update => update.ref !== n.ref)).map(n => n.ref),
    inserts: inserts.map(defaultQuantityToOne),
    needs: needs.map(defaultQuantityToOne),
    updates,
  },
});

export const transforms = (
  transfos: client.IQueryTransformation
): Record<'transforms', internal.IQueryTransformationInternal> | {} => {
  if (!transfos || (!transfos.inserts && !transfos.needs && !transfos.updates)) {
    return {};
  }
  return transformsHelper(
    (transfos.needs || []).filter(isTaskTransformNeed),
    (transfos.updates || []).filter(isTaskTransformUpdate),
    (transfos.inserts || []).filter(isTaskTransformInsert)
  );
};

export const splittable = (split?: boolean): Record<'splittable', boolean> => {
  return {
    splittable: split == null ? true : split
  }
}

/* tslint:disable:no-object-literal-type-assertion */
/**
 * Merge all partials queries to form one query. Provide default `id`, `name` and `kind` (`IBaseQuery` properties)
 * @param factories Partial query objects resulting from factories functions
 * @returns Query object built from merging all partials
 */
export const queryFactory = (
  ...factories: Array<Partial<internal.IQueryInternal>>
): internal.IQueryInternal => {
  return {
    ...id(),
    ...name(),
    ...kind(),
    ...position({ duration: { target: 2 } }),
    ...splittable(false),
    ...factories.reduce((a, b) => ({ ...a, ...b }), {}),
  } as internal.IQueryInternal;
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
export const sanitize = (query: any): internal.IQueryInternal => {
  return queryFactory(
    id(query.id),
    name(query.name),
    kind(query.kind),
    position(query.position),
    links(query.links),
    timeRestrictions(query.timeRestrictions),
    transforms(query.transforms),
    splittable(query.splittable)
  );
};

export const isTaskTransformNeed = (userNeed: any): userNeed is client.ITaskTransformNeed => {
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
): userInsert is client.ITaskTransformInsert => {
  return userInsert != null && userInsert.collectionName != null && userInsert.doc != null;
};

export const isTaskTransformUpdate = (
  userUpdate: any
): userUpdate is client.ITaskTransformUpdate => {
  return userUpdate != null && userUpdate.ref != null && userUpdate.update != null;
};
