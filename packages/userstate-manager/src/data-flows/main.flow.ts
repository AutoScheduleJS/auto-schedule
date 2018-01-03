import { IQuery, ITransformation } from '@autoschedule/queries-fn';
import { IMaterial, IPotentiality, IRange } from '@autoschedule/queries-scheduler';
import { intersect, simplify } from 'intervals-fn';
import * as loki from 'lokijs';
import { aperture, groupWith, identity, prop, sortBy, uniq, unnest } from 'ramda';

import { IConfig } from '../data-structures/config.interface';
import {
  INeedSatisfaction,
  IRangeNeedSatisfaction,
} from '../data-structures/need-satisfaction.interface';
import { ITransformationRange } from '../data-structures/transformation-range.interface';

import { handleTransformations } from './transformations.flow';

const serializedDBToDB = (serialized: string): Loki => {
  const db = new loki('simul');
  db.loadJSON(serialized);
  return db;
};

const configToRange = (config: IConfig) => ({ start: config.startDate, end: config.endDate });
const configToTransforanges = (config: IConfig) => ({
  end: config.endDate,
  start: config.startDate,
  transforms: [],
});

const rangeSatisEligible = (rangeSat: IRangeNeedSatisfaction): boolean =>
  rangeSat.needsSatisfaction.every(satis => satis.satisfied);

export const queryToStatePotentials = (baseStatePromise: Promise<string>) => (config: IConfig) => (
  queries: IQuery[]
) => (query: IQuery, potentials: IPotentiality[], materials: IMaterial[]): Promise<IRange[]> => {
  if (!query.transforms) {
    return Promise.resolve([configToRange(config)]);
  }
  const transform = query.transforms;
  return baseStatePromise.then(serializedDBToDB).then(db => {
    const rangesSatisfaction = regroupTransforanges([
      configToTransforanges(config),
      ...mergePotsAndMatsToTransforanges(queries, potentials, materials),
    ]).map(transfoToRangesSatisfaction(db, transform));
    const result = simplify(rangesSatisfaction.filter(rangeSatisEligible));
    if (result.length) {
      return result;
    }
    throw rangesSatisfaction;
  });
};

const transfoToRangesSatisfaction = (db: Loki, transform: ITransformation) => (
  transfo: ITransformationRange
): IRangeNeedSatisfaction => {
  handleTransformations(db, transfo.transforms);
  return {
    end: transfo.end,
    needsSatisfaction: transform.needs.map((need): INeedSatisfaction => {
      const collection = db.getCollection(need.collectionName);
      if (!collection) {
        return { need, satisfied: false };
      }
      const docs = collection.find(need.find);
      return { need, satisfied: docs.length >= need.quantity };
    }),
    start: transfo.start,
  };
};

const mergePotsAndMatsToTransforanges = (
  queries: IQuery[],
  potentials: IPotentiality[],
  materials: IMaterial[]
): ITransformationRange[] => {
  return sortByTime(
    unnest([
      ...potentials.map(potentialToTransforanges(queries)),
      ...materials.map(materialToTransforanges(queries)),
    ])
  );
};

const sortByTime = sortBy<ITransformationRange>(prop('start'));
const ascendingSort = sortBy<number>(identity);

const regroupTransforanges = (transforms: ITransformationRange[]): ITransformationRange[] => {
  const stepRanges: IRange[] = aperture(
    2,
    ascendingSort(uniq(unnest(transforms.map(t => [t.start, t.end]))))
  ).map(([a, b]) => ({ end: b, start: a }));
  return groupWith<ITransformationRange, ITransformationRange[]>(
    (a, b) => a.start === b.start && a.end === b.end,
    intersect(stepRanges, transforms)
  ).map(transfos =>
    transfos.reduce((a, b) => ({ ...a, range: [...a.transforms, ...b.transforms] }))
  );
};

const potentialToTransforanges = (queries: IQuery[]) => (
  potential: IPotentiality
): ITransformationRange[] => {
  const query: IQuery = queries.find(q => potential.queryId === q.id) as IQuery;
  if (!query.transforms) {
    return [];
  }
  const transform = query.transforms;
  return potential.places.map(place => ({
    ...place,
    transforms: [transform],
  }));
};

const materialToTransforanges = (queries: IQuery[]) => (
  material: IMaterial
): ITransformationRange[] => {
  const query: IQuery = queries.find(q => material.queryId === q.id) as IQuery;
  if (!query.transforms) {
    return [];
  }
  const transform = query.transforms;
  return [
    {
      end: material.end,
      start: material.start,
      transforms: [transform],
    },
  ];
};
