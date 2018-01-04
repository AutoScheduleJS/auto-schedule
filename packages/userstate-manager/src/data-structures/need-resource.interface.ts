import { ITaskTransformNeed } from '@autoschedule/queries-fn';

export interface INeedResource extends ITaskTransformNeed {
  docs?: LokiObj[];
}