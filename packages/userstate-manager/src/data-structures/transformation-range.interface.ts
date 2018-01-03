import { ITransformation } from "@autoschedule/queries-fn";
import { IRange } from '@autoschedule/queries-scheduler';

export interface ITransformationRange extends IRange {
  readonly transforms:  ITransformation[];
}