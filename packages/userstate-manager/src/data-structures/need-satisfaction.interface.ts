import { ITaskTransformNeedInternal } from '@autoschedule/queries-fn';

import { IRange } from './queries-scheduler.interface';

export interface INeedSatisfaction {
  readonly docs: ReadonlyArray<LokiObj>;
  readonly need: ITaskTransformNeedInternal;
  readonly satisfied: boolean;
}

export interface IRangeNeedSatisfaction extends IRange {
  readonly needSatisfactions: ReadonlyArray<INeedSatisfaction>;
}
