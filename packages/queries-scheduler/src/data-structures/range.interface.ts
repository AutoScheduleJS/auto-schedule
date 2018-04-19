export interface IRange {
  readonly start: number;
  readonly end: number;
}

export interface IDurRange extends IRange {
  readonly duration: number;
  readonly tipKind: 'start' | 'end' | 'target';
}