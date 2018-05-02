import { IRange } from './range.interface';

export interface IPressureChunk extends IRange {
  readonly pressureStart: number;
  readonly pressureEnd: number;
}

export interface IPressureChunkMerge extends IPressureChunk {
  readonly originalRange: IRange;
}
