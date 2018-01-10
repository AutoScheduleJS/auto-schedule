import {
  ITaskTransformInsert,
  ITaskTransformNeed,
  ITaskTransformUpdate,
} from '@autoschedule/queries-fn';

export interface ITransformationTime {
  readonly time: number;
  readonly needs: ReadonlyArray<ITaskTransformNeed>;
  readonly updates: ReadonlyArray<ITaskTransformUpdate>;
  readonly inserts: ReadonlyArray<ITaskTransformInsert>;
  readonly deletes: ReadonlyArray<string>
}
