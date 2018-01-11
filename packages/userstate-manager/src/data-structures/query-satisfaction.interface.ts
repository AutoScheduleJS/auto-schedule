import {
  ITaskTransformInsert,
  ITaskTransformNeed,
  ITaskTransformUpdate,
} from '@autoschedule/queries-fn';
import { IRange } from '@autoschedule/queries-scheduler';

export interface ISatisfied {
  satisfied: boolean;
}

export interface INeedSatisfaction extends ISatisfied {
  need: ITaskTransformNeed;
}

export interface IUpdateSatisfaction extends ISatisfied {
  update: ITaskTransformUpdate;
}

export interface IInsertSatisfaction extends ISatisfied {
  insert: ITaskTransformInsert;
}

export interface IRangeQuerySatisfaction extends IRange {
  needSatisfactions: INeedSatisfaction[];
  updateSatisfactions: IUpdateSatisfaction[];
  insertSatisfactions: IInsertSatisfaction[];
}
