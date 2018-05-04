import { IRange } from './range.interface';

export interface IAreaPressureChunk extends IRange {
  readonly areaPressure: number;
}

export interface IPressureChunk extends IRange {
  readonly pressureStart: number;
  readonly pressureEnd: number;
}

export interface IPressureChunkMerge extends IPressureChunk {
  readonly originalRange: IRange;
}
