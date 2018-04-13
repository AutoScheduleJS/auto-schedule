import {
  ITaskTransformUpdate,
  ITimeBoundary,
  ITimeRestrictions,
  QueryKind,
} from './client.structures';

export interface ITaskTransformInsertInternal {
  readonly collectionName: string;
  readonly doc: any;
  readonly quantity: number;
  readonly wait?: boolean;
}

export interface ITaskTransformNeedInternal {
  readonly collectionName: string;
  readonly ref: string; // Unique ID
  readonly find: any;
  readonly quantity: number;
  readonly wait?: boolean;
}

export interface IQueryTransformationInternal {
  readonly needs: ReadonlyArray<ITaskTransformNeedInternal>;
  readonly updates: ReadonlyArray<ITaskTransformUpdate>;
  readonly inserts: ReadonlyArray<ITaskTransformInsertInternal>;
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
  readonly splittable: boolean;
  readonly transforms?: IQueryTransformationInternal;
  readonly links?: ReadonlyArray<IQueryLinkInternal>;
  readonly timeRestrictions?: ITimeRestrictions;
}
