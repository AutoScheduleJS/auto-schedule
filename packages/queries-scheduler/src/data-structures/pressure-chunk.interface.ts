import { IRange } from './range.interface';

export interface IPressureChunk extends IRange {
  /**
   * start/end pressure correspond to pressure at start/end time
   */
  readonly pressure: IRange;
}
