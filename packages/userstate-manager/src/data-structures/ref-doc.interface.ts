export interface IRefDoc {
  collectionName: string;
  docs: ReadonlyArray<LokiObj>,
  ref: string;
}