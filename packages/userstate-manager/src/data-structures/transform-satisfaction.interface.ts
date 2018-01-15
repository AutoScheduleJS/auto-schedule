import {
  ITaskTransformInsert,
  ITaskTransformNeed,
  ITaskTransformUpdate,
} from '@autoschedule/queries-fn';
import { IRange } from '@autoschedule/queries-scheduler';

export type transform = ITaskTransformInsert | ITaskTransformNeed | ITaskTransformUpdate;

export interface ITransformSatisfaction {
  range: IRange;
  transform: transform;
}