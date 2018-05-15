export interface IRange {
  readonly start: number;
  readonly end: number;
}

export type IPotRangeKind = 'start-after' | 'start-before' | 'end-after' | 'end-before' | 'start' | 'end';

export interface IPotRange extends IRange {
  readonly kind: IPotRangeKind;
}
