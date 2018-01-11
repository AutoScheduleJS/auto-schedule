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

export interface IBaseQuery {
  readonly id: number;
  readonly name: string;
  readonly kind: QueryKind;
  readonly transforms?: ITransformation;
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

export interface IProviderQuery extends IAtomicQuery {
  readonly provide: IChunkIdentifier;
  readonly timeRestrictions?: ITimeRestrictions;
}

export interface IChunkIdentifier {
  readonly queryId: number;
  readonly materialId?: number;
  readonly splitId?: number;
}