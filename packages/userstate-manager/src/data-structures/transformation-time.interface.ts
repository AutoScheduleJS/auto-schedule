import {
  ITaskTransformInsert,
  ITaskTransformNeed,
  ITaskTransformUpdate,
} from '@autoschedule/queries-fn';

import { IIdentifier } from './identifier.interface';

export type allTransfo = ITaskTransformInsert | ITaskTransformNeed | ITaskTransformUpdate | string;
export interface IQueryTransfo<T extends allTransfo> {
  id: IIdentifier;
  transfo: T;
}

export interface ITransformationTime {
  readonly time: number;
  readonly needs: ReadonlyArray<IQueryTransfo<ITaskTransformNeed>>;
  readonly updates: ReadonlyArray<IQueryTransfo<ITaskTransformUpdate>>;
  readonly inserts: ReadonlyArray<IQueryTransfo<ITaskTransformInsert>>;
  readonly deletes: ReadonlyArray<IQueryTransfo<string>>;
}
