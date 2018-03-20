export enum QueryKind {
  Placeholder,
  Atomic,
}

export enum GoalKind {
  Atomic,
  Splittable,
}

export enum RestrictionCondition {
  InRange,
  OutRange,
}

export interface ITaskTransformNeed {
  readonly collectionName: string;
  readonly ref: string; // Unique ID
  readonly find: any;
  readonly quantity: number;
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
  readonly quantity: number;
  readonly wait?: boolean;
}

export interface ITransformation {
  readonly needs: ReadonlyArray<ITaskTransformNeed>;
  readonly updates: ReadonlyArray<ITaskTransformUpdate>;
  readonly inserts: ReadonlyArray<ITaskTransformInsert>;
  readonly deletes: ReadonlyArray<string>;
}

export interface IGoal {
  readonly kind: GoalKind;
  readonly quantity: ITimeDuration;
  readonly time: number;
}

export interface ITimeDuration {
  readonly min: number;
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

export interface IBaseQuery {
  readonly id: QueryID;
  readonly name: string;
  readonly kind: QueryKind;
  readonly transforms?: ITransformation;
  readonly links?: ReadonlyArray<IQueryLink>
}

export interface IGoalQuery extends IBaseQuery {
  readonly goal: IGoal;
  readonly timeRestrictions?: ITimeRestrictions;
}

export interface IAtomicQuery extends IBaseQuery {
  readonly start?: ITimeBoundary;
  readonly end?: ITimeBoundary;
  readonly duration?: ITimeDuration;
}
