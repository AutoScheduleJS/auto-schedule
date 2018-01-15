import {
  ITaskTransformInsert,
  ITaskTransformNeed,
  ITaskTransformUpdate
} from '@autoschedule/queries-fn';

export type allTransfo = ITaskTransformInsert | ITaskTransformNeed | ITaskTransformUpdate | string;

export interface IQueryTransfo<T extends allTransfo> {
  id: string;
  transfo: T;
}

export interface ITransformationTime {
  readonly time: number;
  readonly needs: ReadonlyArray<IQueryTransfo<ITaskTransformNeed>>;
  readonly updates: ReadonlyArray<IQueryTransfo<ITaskTransformUpdate>>;
  readonly inserts: ReadonlyArray<IQueryTransfo<ITaskTransformInsert>>;
  readonly deletes: ReadonlyArray<IQueryTransfo<string>>;
}
