import { IRange } from '@autoschedule/queries-scheduler';

export interface INeedSatisfaction {
  need: any;
  satisfied: boolean;
}

export interface IRangeNeedSatisfaction extends IRange {
  needsSatisfaction: INeedSatisfaction[];
}