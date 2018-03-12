import { ITaskTransformNeed } from '@autoschedule/queries-fn';

import { IIdentifier } from './identifier.interface';

export interface INeedResource extends ITaskTransformNeed {
  readonly missing: number;
  readonly missingTime: ReadonlyArray<number>;
  readonly id: IIdentifier;
  readonly docs?: LokiObj[];
}

export interface IGroupNeedResource extends ITaskTransformNeed {
  readonly missing: number;
  readonly missingTime: ReadonlyArray<number>;
  readonly ids: ReadonlyArray<IIdentifier>;
  readonly docs?: LokiObj[];
}
