import { ITaskTransformNeed } from '@autoschedule/queries-fn';
import { IRange } from '@autoschedule/queries-scheduler';

export interface INeedSatisfaction {
  need: ITaskTransformNeed;
  satisfied: boolean;
}

export interface IRangeNeedSatisfaction extends IRange {
  needsSatisfaction: INeedSatisfaction[];
}