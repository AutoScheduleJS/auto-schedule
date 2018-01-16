import { IQuery, ITransformation } from '@autoschedule/queries-fn';
import { IMaterial, IPotentiality, IRange } from '@autoschedule/queries-scheduler';
import { intersect, simplify } from 'intervals-fn';
import * as loki from 'lokijs';
import { groupWith, prop, sortBy, unnest } from 'ramda';

import { IConfig } from '../data-structures/config.interface';
import { IIdentifier } from '../data-structures/identifier.interface';
import { INeedResource } from '../data-structures/need-resource.interface';
import { IRangeNeedSatisfaction } from '../data-structures/need-satisfaction.interface';
import { IRefDoc } from '../data-structures/ref-doc.interface';
import { ITransformSatisfaction } from '../data-structures/transform-satisfaction.interface';
import {
  allTransfo,
  ITransformationTime,
} from '../data-structures/transformation-time.interface';

import { compteRangeSatisfaction, computeOutputSatisfaction } from './satisfactions.flow';

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
  rangeSat.needSatisfactions.every(sat => sat.satisfied);

const useSameResources = (a: INeedResource, b: INeedResource): boolean => {
  return (
    a.id.query === b.id.query &&
    a.id.potential === b.id.potential &&
    a.id.material === b.id.material &&
    a.id.split === b.id.split
  );
};

const groupNeedResources = (needResources: INeedResource[]) => {
  return groupWith<INeedResource>(useSameResources)(sortByMissingTime(needResources)).map(
    needRes =>
      needRes.reduce((a, b) => ({ ...a, missingTime: [...a.missingTime, ...b.missingTime] }))
  );
};

export const queryToStatePotentials = (baseStatePromise: Promise<string>) => (config: IConfig) => (
  queries: IQuery[]
) => (query: IQuery, potentials: IPotentiality[], materials: IMaterial[]): Promise<IRange[]> => {
  if (!query.transforms) {
    return Promise.resolve([configToRange(config)]);
  }
  const transforms = query.transforms;
  return baseStatePromise.then(serializedDBToDB).then(db => {
    const timeTransfo = regroupTransfoTime(config, queries, potentials, materials);
    const [needSatis, needResources] = compteRangeSatisfaction(db, transforms, timeTransfo);
    const shrinkSpaces = computeShrinkSpace(potentials, materials);
    const configRange = configToRange(config);
    const outputSatis = computeOutputSatisfaction(
      configRange,
      rangeNeedSatisToDocs(needSatis),
      groupNeedResources(needResources),
      transforms,
      idToShrinkSpace(shrinkSpaces)
    );
    const outputRange = outputSatis.map(s => s.range).reduce((a, b) => {
      const res = intersect(a, b);
      return res.length ? res[0] : { start: 0, end: 0 };
    }, configRange);
    const result = intersect(simplify(needSatis.filter(rangeSatisEligible)), outputRange);
    if (result.length) {
      return result;
    }
    throw insatisToError(needSatis, outputSatis);
  });
};

const rangeSatisToTransfoSatis = (
  rangeNeedSatis: IRangeNeedSatisfaction[]
): ITransformSatisfaction[] => {
  return unnest(
    rangeNeedSatis.map(nsObj =>
      nsObj.needSatisfactions
        .filter(ns => !ns.satisfied)
        .map(ns => ({ range: { start: nsObj.start, end: nsObj.end }, transform: ns.need }))
    )
  );
};

const insatisToError = (
  needSatis: IRangeNeedSatisfaction[],
  outputSatis: ITransformSatisfaction[]
) => {
  return [...rangeSatisToTransfoSatis(needSatis), ...outputSatis];
};

const rangeNeedSatiToDoc = (rangeNeed: IRangeNeedSatisfaction | undefined): IRefDoc[] =>
  rangeNeed
    ? rangeNeed.needSatisfactions.map(needSatis => ({
        collectionName: needSatis.need.collectionName,
        docs: needSatis.docs,
        ref: needSatis.need.ref,
      }))
    : [];
const rangeNeedSatisToDocs = (rangeNeeds: IRangeNeedSatisfaction[]) =>
  rangeNeedSatiToDoc(rangeNeeds.find(rangeNeed => rangeSatisEligible(rangeNeed)));

const areSameId = (a: IIdentifier, b: IIdentifier): boolean => {
  return Object.keys(a).every(k => a[k] === b[k]);
};

const idToShrinkSpace = (shrinkSpaces: Array<{ id: IIdentifier; space: number }>) => (
  id: IIdentifier
) => {
  const space = shrinkSpaces.find(sp => areSameId(sp.id, id)) as { id: IIdentifier; space: number };
  return space.space;
};

const potToId = (potential: IPotentiality, placeI: number): IIdentifier => ({
  place: `${placeI}`,
  potential: `${potential.potentialId}`,
  query: `${potential.queryId}`,
});

const potToShrinkSpace = (potential: IPotentiality) => (place: IRange, placeI: number) => {
  const id = potToId(potential, placeI);
  const space = place.end - place.start - potential.duration.min;
  return {
    id,
    space,
  };
};

const matToId = (material: IMaterial): IIdentifier => ({
  material: `${material.materialId}`,
  query: `${material.queryId}`,
  split: `${material.splitId || 0}`,
});

const matToShrinkSpace = (material: IMaterial) => {
  const id = matToId(material);
  return {
    id,
    space: 0,
  };
};

const computeShrinkSpace = (potentials: IPotentiality[], materials: IMaterial[]) => {
  const potsShrink = unnest(
    potentials.map(potential => potential.places.map(potToShrinkSpace(potential)))
  );
  const matShrink = materials.map(matToShrinkSpace);
  return [...potsShrink, ...matShrink];
};

const regroupTransfoTime = (
  config: IConfig,
  queries: IQuery[],
  potentials: IPotentiality[],
  materials: IMaterial[]
) => {
  return groupWith<ITransformationTime>((a, b) => a.time === b.time)(
    sortByTime([
      ...configToTransforanges(config),
      ...mergePotsAndMatsToTransforanges(queries, potentials, materials),
    ])
  ).map(a => a.reduce(reduceTransfoGroup));
};
const reduceTransfoGroup = (a: ITransformationTime, b: ITransformationTime) => ({
  deletes: [...a.deletes, ...b.deletes],
  inserts: [...a.inserts, ...b.inserts],
  needs: [...a.needs, ...b.needs],
  time: a.time,
  updates: [...a.updates, ...b.updates],
});

const sortByTime = sortBy<ITransformationTime>(prop('time'));
const sortByMissingTime = (needResources: INeedResource[]) =>
  needResources.sort((a, b) => a.missingTime[0] - b.missingTime[0]);

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

const transfoToQueryTransfo = (id: IIdentifier) => <T extends allTransfo>(
  transfo: ReadonlyArray<T>
) => {
  return transfo.map(t => ({ id, transfo: t }));
};

/**
 * Use query chunk identifier. Compute shrink space before.
 */
const placeToTransfoTime = (
  id: IIdentifier,
  transfo: ITransformation,
  start: number,
  end: number
): ITransformationTime[] => {
  const toQueryTransfo = transfoToQueryTransfo(id);
  return [
    {
      deletes: [],
      inserts: [],
      needs: toQueryTransfo(transfo.needs),
      time: start,
      updates: [],
    },
    {
      deletes: toQueryTransfo(transfo.deletes),
      inserts: toQueryTransfo(transfo.inserts),
      needs: [],
      time: end,
      updates: toQueryTransfo(transfo.updates),
    },
  ];
};

const potentialToTransforanges = (queries: IQuery[]) => (
  potential: IPotentiality
): ITransformationTime[] => {
  const query: IQuery = queries.find(q => potential.queryId === q.id) as IQuery;
  const transform = query.transforms;
  if (!transform) {
    return [];
  }
  return unnest(
    potential.places.map((place, i) =>
      placeToTransfoTime(potToId(potential, i), transform, place.start, place.end)
    )
  );
};

const materialToTransforanges = (queries: IQuery[]) => (
  material: IMaterial
): ITransformationTime[] => {
  const query: IQuery = queries.find(q => material.queryId === q.id) as IQuery;
  const transform = query.transforms;
  if (!transform) {
    return [];
  }
  return placeToTransfoTime(matToId(material), transform, material.start, material.end);
};
