import { IQuery } from '@autoschedule/queries-fn';
import { IMaterial, IPotentiality, IRange } from '@autoschedule/queries-scheduler';

import { IConfig } from '../data-structures/config.interface';

export const queryToStatePotential = (baseState: Promise<any>) => (config: IConfig) => (
  query: IQuery,
  potentials: IPotentiality[],
  materials: IMaterial[]
): IRange[] => {
  return [];
};
