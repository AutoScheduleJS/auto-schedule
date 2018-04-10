import {
  ITaskTransformInsertInternal,
  ITaskTransformNeedInternal,
  ITaskTransformUpdate,
} from '@autoschedule/queries-fn';

import { IIdentifier } from './identifier.interface';

export type allTransfo = ITaskTransformInsertInternal | ITaskTransformNeedInternal | ITaskTransformUpdate | string;
export interface IQueryTransfo<T extends allTransfo> {
  id: IIdentifier;
  transfo: T;
}

export interface ITransformationTime {
  readonly time: number;
  readonly needs: ReadonlyArray<IQueryTransfo<ITaskTransformNeedInternal>>;
  readonly updates: ReadonlyArray<IQueryTransfo<ITaskTransformUpdate>>;
  readonly inserts: ReadonlyArray<IQueryTransfo<ITaskTransformInsertInternal>>;
  readonly deletes: ReadonlyArray<IQueryTransfo<string>>;
}
