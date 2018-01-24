import {
  ITaskTransformInsert,
  ITaskTransformNeed,
  ITaskTransformUpdate,
} from '@autoschedule/queries-fn';
import { IRange } from './queries-scheduler.interface';

export type transformType = ITaskTransformInsert | ITaskTransformNeed | ITaskTransformUpdate;

export interface ITransformSatisfaction {
  range: IRange;
  transform: transformType;
}