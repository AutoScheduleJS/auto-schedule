import { ITimeDurationInternal } from '@autoschedule/queries-fn';
import { IDurRange } from './range.interface';

export interface IPotentialityBase {
  readonly isSplittable: boolean;
  readonly queryId: number;
  readonly potentialId: number;
  readonly places: ReadonlyArray<IDurRange>;
}

export interface IPotentiality extends IPotentialityBase {
  readonly pressure: number;

  /**
   * Should be the target duration.
   */
  readonly duration: ITimeDurationInternal;
}

export interface IPotentialitySimul extends IPotentialityBase {
  readonly duration: number;
  readonly [others: string]: any;
}
