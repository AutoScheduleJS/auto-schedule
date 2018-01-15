import { ITaskTransformNeed } from '@autoschedule/queries-fn';
import { IRange } from '@autoschedule/queries-scheduler';

export interface INeedSatisfaction {
  readonly docs: ReadonlyArray<LokiObj>;
  readonly need: ITaskTransformNeed;
  readonly satisfied: boolean;
}

export interface IRangeNeedSatisfaction extends IRange {
  readonly needSatisfactions: ReadonlyArray<INeedSatisfaction>;
}
