import {
  ITaskTransformInsert,
  ITaskTransformNeed,
  ITaskTransformUpdate,
  ITimeBoundary,
  ITimeRestrictions,
  QueryKind,
} from './client.structures';

export interface IQueryTransformationInternal {
  readonly needs: ReadonlyArray<ITaskTransformNeed>;
  readonly updates: ReadonlyArray<ITaskTransformUpdate>;
  readonly inserts: ReadonlyArray<ITaskTransformInsert>;
  readonly deletes: ReadonlyArray<string>;
}

export interface ITimeDurationInternal {
  readonly min: number;
  readonly target: number;
}

export type QueryIDInternal = number;

export interface IQueryLinkInternal {
  queryId: QueryIDInternal;
  potentialId: number;
  splitId?: number;
  distance: ITimeBoundary;
  origin: 'start' | 'end';
}

export interface IQueryPositionDurationInternal {
  readonly start?: ITimeBoundary;
  readonly end?: ITimeBoundary;
  readonly duration: ITimeDurationInternal;
}

export type IQueryPositionInternal = IQueryPositionDurationInternal;

export interface IQueryInternal {
  readonly id: QueryIDInternal;
  readonly name: string;
  readonly kind: QueryKind;
  readonly position: IQueryPositionInternal;
  readonly transforms?: IQueryTransformationInternal;
  readonly links?: ReadonlyArray<IQueryLinkInternal>;
  readonly timeRestrictions?: ITimeRestrictions;
}
