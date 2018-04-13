import {
  ITaskTransformInsertInternal,
  ITaskTransformNeedInternal,
  ITaskTransformUpdate,
} from '@autoschedule/queries-fn';
import { IRange } from './queries-scheduler.interface';

export type transformType = ITaskTransformInsertInternal | ITaskTransformNeedInternal | ITaskTransformUpdate;

export interface ITransformSatisfaction {
  ranges: ReadonlyArray<IRange>;
  transform: transformType;
}
