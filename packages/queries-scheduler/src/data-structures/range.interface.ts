export interface IRange {
  readonly start: number;
  readonly end: number;
}

export interface IPotRange extends IRange {
  readonly kind: 'start-after' | 'start-before' | 'end-after' | 'end-before' | 'start' | 'end';
}
