import { ITimeDurationInternal } from '@autoschedule/queries-fn';

export interface IMaterial extends IRange {
  readonly queryId: number;
  readonly materialId: number;
  readonly splitId?: number;
}

export interface IPotRange extends IRange {
  readonly kind: 'start-after' | 'start-before' | 'end-after' | 'end-before' | 'start' | 'end';
}

export interface IPotentiality {
  readonly isSplittable: boolean;
  readonly queryId: number;
  readonly potentialId: number;
  readonly pressure: number;
  readonly places: ReadonlyArray<ReadonlyArray<IPotRange>>;
  readonly duration: ITimeDurationInternal;
}

export interface IRange {
  readonly end: number;
  readonly start: number;
}
