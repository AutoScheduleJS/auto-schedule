import { ITaskTransformNeed } from '@autoschedule/queries-fn';

export interface INeedResource extends ITaskTransformNeed {
  readonly missing: number;
  readonly missingTime?: number;
  readonly id: string;
  readonly docs?: LokiObj[];
}
