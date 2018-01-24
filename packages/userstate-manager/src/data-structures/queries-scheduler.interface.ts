import { ITimeDuration } from '@autoschedule/queries-fn';

export interface IMaterial extends IRange {
  readonly queryId: number;
  readonly materialId: number;
  readonly splitId?: number;
}

export interface IPotentiality {
  readonly isSplittable: boolean;
  readonly queryId: number;
  readonly potentialId: number;
  readonly pressure: number;
  readonly places: ReadonlyArray<IRange>;
  readonly duration: ITimeDuration;
}

export interface IRange {
  readonly end: number;
  readonly start: number;
}
