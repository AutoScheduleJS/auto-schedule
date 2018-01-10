import { IQuery, ITaskTransformNeed, ITransformation } from '@autoschedule/queries-fn';
import { IMaterial, IPotentiality, IRange } from '@autoschedule/queries-scheduler';
import { simplify } from 'intervals-fn';
import * as loki from 'lokijs';
import { groupWith, prop, sortBy, unfold, unnest } from 'ramda';

import { IConfig } from '../data-structures/config.interface';
import { INeedResource } from '../data-structures/need-resource.interface';
import {
  INeedSatisfaction,
  IRangeNeedSatisfaction,
} from '../data-structures/need-satisfaction.interface';
import { ITransformationTime } from '../data-structures/transformation-time.interface';

import { handleTransformations } from './transformations.flow';

const serializedDBToDB = (serialized: string): Loki => {
  const db = new loki('simul');
  db.loadJSON(serialized);
  return db;
};

const configToRange = (config: IConfig) => ({ start: config.startDate, end: config.endDate });
const configToTransforanges = (config: IConfig): ITransformationTime[] => [
  { deletes: [], time: config.endDate, inserts: [], needs: [], updates: [] },
  { deletes: [], time: config.startDate, inserts: [], needs: [], updates: [] },
];

const rangeSatisEligible = (rangeSat: IRangeNeedSatisfaction): boolean =>
  rangeSat.needsSatisfaction.every(satis => satis.satisfied);

export const queryToStatePotentials = (baseStatePromise: Promise<string>) => (config: IConfig) => (
  queries: IQuery[]
) => (query: IQuery, potentials: IPotentiality[], materials: IMaterial[]): Promise<IRange[]> => {
  if (!query.transforms) {
    return Promise.resolve([configToRange(config)]);
  }
  const needs = query.transforms.needs;
  return baseStatePromise.then(serializedDBToDB).then(db => {
    const timeTransfo = regroupTransfoTime(
      sortByTime([
        ...configToTransforanges(config),
        ...mergePotsAndMatsToTransforanges(queries, potentials, materials),
      ])
    ).map(a => a.reduce(reduceTransfoGroup)); /*.map(transfoToRangesSatisfaction(db, transform)); */
    const rangesSatisfaction = unfold(rangeSatisfactionUnfolder(db, needs, timeTransfo), [
      [],
      0,
    ] as [INeedResource[], number]);
    const result = simplify(rangesSatisfaction.filter(rangeSatisEligible));
    if (result.length) {
      return result;
    }
    throw rangesSatisfaction;
  });
};

const regroupTransfoTime = groupWith<ITransformationTime>((a, b) => a.time === b.time);
const reduceTransfoGroup = (a: ITransformationTime, b: ITransformationTime) => ({
  deletes: [...a.deletes, ...b.deletes],
  inserts: [...a.inserts, ...b.inserts],
  needs: [...a.needs, ...b.needs],
  time: a.time,
  updates: [...a.updates, ...b.updates],
});

const rangeSatisfactionUnfolder = (
  db: Loki,
  needs: ReadonlyArray<ITaskTransformNeed>,
  timeTransfo: ITransformationTime[]
) => ([inputResources, transfoIndex]: [INeedResource[], number]):
  | false
  | [IRangeNeedSatisfaction, [ITaskTransformNeed[], number]] => {
  if (transfoIndex + 1 >= timeTransfo.length) {
    return false;
  }
  const firstTransfo = timeTransfo[transfoIndex];
  const afterInputResources = handleTransformations(db, firstTransfo, inputResources);
  const result = {
    end: timeTransfo[transfoIndex + 1].time,
    needsSatisfaction: needs.map((need): INeedSatisfaction => {
      const collection = db.getCollection(need.collectionName);
      if (!collection) {
        return { need, satisfied: false };
      }
      const docs = collection.find(need.find);
      return { need, satisfied: docs.length >= need.quantity };
    }),
    start: timeTransfo[transfoIndex].time,
  };
  return [result, [afterInputResources, transfoIndex + 1]];
};

const sortByTime = sortBy<ITransformationTime>(prop('time'));

const mergePotsAndMatsToTransforanges = (
  queries: IQuery[],
  potentials: IPotentiality[],
  materials: IMaterial[]
): ITransformationTime[] => {
  return sortByTime(
    unnest([
      ...potentials.map(potentialToTransforanges(queries)),
      ...materials.map(materialToTransforanges(queries)),
    ])
  );
};

const placeToTransfoTime = (transfo: ITransformation, start: number, end: number): ITransformationTime[] => [
  {
    deletes: transfo.deletes,
    inserts: [],
    needs: transfo.needs,
    time: start,
    updates: [],
  },
  {
    deletes: transfo.deletes,
    inserts: transfo.inserts,
    needs: [],
    time: end,
    updates: transfo.updates,
  },
];

const potentialToTransforanges = (queries: IQuery[]) => (
  potential: IPotentiality
): ITransformationTime[] => {
  const query: IQuery = queries.find(q => potential.queryId === q.id) as IQuery;
  if (!query.transforms) {
    return [];
  }
  const transform = query.transforms;
  return unnest(
    potential.places.map(place => placeToTransfoTime(transform, place.start, place.end))
  );
};

const materialToTransforanges = (queries: IQuery[]) => (
  material: IMaterial
): ITransformationTime[] => {
  const query: IQuery = queries.find(q => material.queryId === q.id) as IQuery;
  if (!query.transforms) {
    return [];
  }
  const transform = query.transforms;
  return placeToTransfoTime(transform, material.start, material.end);
};
