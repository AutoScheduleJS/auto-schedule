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
  readonly provide: number;
  readonly timeRestrictions?: ITimeRestrictions;
}
