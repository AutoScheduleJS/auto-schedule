export enum QueryKind {
  Placeholder,
  Atomic,
}

export enum RestrictionCondition {
  InRange,
  OutRange,
}

export interface ITaskTransformNeed {
  readonly collectionName: string;
  readonly ref: string; // Unique ID
  readonly find: any;
  readonly quantity?: number;
  readonly wait?: boolean;
}

export interface IUpdateObject {
  readonly property: string;
  readonly value: string;
  readonly arrayMethod?: 'Push' | 'Delete';
}

export interface ITaskTransformUpdate {
  readonly ref: string;
  readonly update: ReadonlyArray<IUpdateObject>;
  readonly wait?: boolean;
}

export interface ITaskTransformInsert {
  readonly collectionName: string;
  readonly doc: any;
  readonly quantity?: number;
  readonly wait?: boolean;
}

export interface IQueryTransformation {
  readonly needs?: ReadonlyArray<ITaskTransformNeed>;
  readonly updates?: ReadonlyArray<ITaskTransformUpdate>;
  readonly inserts?: ReadonlyArray<ITaskTransformInsert>;
}

export interface ITimeDuration {
  readonly min?: number;
  readonly target: number;
}

export interface ITimeBoundary {
  readonly min?: number;
  readonly target?: number;
  readonly max?: number;
}

export interface ITimeRestriction {
  readonly condition: RestrictionCondition;
  readonly ranges: ReadonlyArray<[number, number]>;
}

export interface ITimeRestrictions {
  readonly hour?: ITimeRestriction;
  readonly weekday?: ITimeRestriction;
  readonly month?: ITimeRestriction;
}

export type QueryID = number;

export interface IQueryLink {
  queryId: QueryID;
  potentialId: number;
  splitId?: number;
  distance: ITimeBoundary;
  origin: 'start' | 'end';
}

export interface IQueryPositionDuration {
  readonly start?: ITimeBoundary;
  readonly end?: ITimeBoundary;
  readonly duration: ITimeDuration;
}

export interface ITimeTargetBoundary {
  readonly min?: number;
  readonly target: number;
  readonly max?: number;
}

export interface ITimeMaxBoundary {
  readonly min?: number;
  readonly target?: number;
  readonly max: number;
}

export interface ITimeMinBoundary {
  readonly min: number;
  readonly target?: number;
  readonly max?: number;
}

export type IStartTimeBoundary = ITimeTargetBoundary | ITimeMaxBoundary;
export type IEndTimeBoundary = ITimeTargetBoundary | ITimeMinBoundary;

export interface IQueryPositionStartEnd {
  readonly start: IStartTimeBoundary;
  readonly end: IEndTimeBoundary;
}

export type IQueryPosition = IQueryPositionDuration | IQueryPositionStartEnd;

export interface IQuery {
  readonly id: QueryID;
  readonly name: string;
  readonly kind: QueryKind;
  readonly position: IQueryPosition;
  readonly transforms?: IQueryTransformation;
  readonly links?: ReadonlyArray<IQueryLink>;
  readonly timeRestrictions?: ITimeRestrictions;
  readonly splittable?: boolean;
}
