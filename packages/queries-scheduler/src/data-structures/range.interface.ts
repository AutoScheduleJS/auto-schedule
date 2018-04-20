export interface IRange {
  readonly start: number;
  readonly end: number;
}

export interface IPotRange extends IRange {
  readonly kind: 'start' | 'end' | 'target';
}