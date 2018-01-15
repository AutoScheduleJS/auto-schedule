import {
  ITaskTransformInsert,
  ITaskTransformNeed,
  ITaskTransformUpdate,
  ITransformation,
} from '@autoschedule/queries-fn';
import { IRange } from '@autoschedule/queries-scheduler';
import * as loki from 'lokijs';
import { times } from 'ramda';

import { INeedResource } from '../data-structures/need-resource.interface';
import {
  INeedSatisfaction,
  IRangeNeedSatisfaction,
} from '../data-structures/need-satisfaction.interface';
import { IRefDoc } from '../data-structures/ref-doc.interface';
import { ITransformSatisfaction } from '../data-structures/transform-satisfaction.interface';
import { ITransformationTime } from '../data-structures/transformation-time.interface';

import { cleanLokiDoc, handleTransformations } from './transformations.flow';

export const compteRangeSatisfaction = (
  db: Loki,
  transfo: ITransformation,
  timeTransfo: ITransformationTime[]
): [IRangeNeedSatisfaction[], INeedResource[]] => {
  let inputResources: INeedResource[] = [];
  let transfoIndex = 0;
  const rangeQuerySatis: IRangeNeedSatisfaction[] = [];

  while (transfoIndex + 1 < timeTransfo.length) {
    const firstTransfo = timeTransfo[transfoIndex];
    inputResources = handleTransformations(db, firstTransfo, inputResources);
    const result: IRangeNeedSatisfaction = {
      end: timeTransfo[transfoIndex + 1].time,
      needSatisfactions: computeNeedSatisfaction(db, transfo.needs),
      start: timeTransfo[transfoIndex].time,
    };
    rangeQuerySatis.push(result);
    transfoIndex += 1;
  }
  return [rangeQuerySatis, inputResources];
};

export const computeOutputSatisfaction = (
  config: IRange,
  queryDocs: IRefDoc[],
  needResources: INeedResource[],
  transforms: ITransformation,
  shrinkSpace: (id: string) => number
): ITransformSatisfaction[] => {
  const [outputSatis, newNeedRes] = computeInsertSatisfaction(
    config,
    shrinkSpace,
    needResources,
    transforms.inserts
  );
  return outputSatis;
};

const docMatchFindFromCol = (col: Collection<any>) => (doc: any, find: any) => {
  col.clear();
  col.insert(cleanLokiDoc(doc));
  return col.find(find);
};

const computeInsertSatisfaction = (
  configRange: IRange,
  shrinkSpace: (id: string) => number,
  needResources: INeedResource[],
  inserts: ReadonlyArray<ITaskTransformInsert>
): [ITransformSatisfaction[], INeedResource[]] => {
  const nrToMT = needResourceToMissingTime(shrinkSpace);
  const outputSatis: ITransformSatisfaction[] = [];
  const db = new loki('satis');
  const docMatchFind = docMatchFindFromCol(db.addCollection('test'));
  let newNeedResources = [...needResources];

  times(insertI => {
    const insert = inserts[insertI];
    if (!insert.wait) {
      return outputSatis.push({ transform: insert, range: configRange });
    }
    const allNR = satisfiedFromInsertNeedResources(insert, needResources, docMatchFind);
    if (!allNR.length) {
      return outputSatis.push({ transform: insert, range: { start: 0, end: 0 } });
    }
    const minNR = allNR.reduce((a, b) => (nrToMT(a) < nrToMT(b) ? a : b));
    const range: IRange = {
      end: nrToMT(minNR),
      start: configRange.start,
    };
    newNeedResources = updateMissing(newNeedResources, minNR);
    return outputSatis.push({ range, transform: insert });
  }, inserts.length);
  return [outputSatis, newNeedResources];
};

const satisfiedFromInsertNeedResources = (
  insert: ITaskTransformInsert,
  needResources: INeedResource[],
  match: (d: any, f: any) => any[]
): INeedResource[] => {
  return needResources.filter(
    res =>
      res.collectionName === insert.collectionName &&
      res.missing > 0 &&
      match(insert.doc, res.find).length > 0
  );
};

const computeNeedSatisfaction = (
  db: Loki,
  needs: ReadonlyArray<ITaskTransformNeed>
): INeedSatisfaction[] =>
  needs.map(need => {
    const col = db.getCollection(need.collectionName);
    const docs = col ? col.find(need.find).slice(0, need.quantity) : [];
    if (!need.wait) {
      return { docs, need, satisfied: true };
    }
    return { docs, need, satisfied: docs.length === need.quantity };
  });

const needResourceToMissingTime = (shrinkSpace: (id: string) => number) => (nr: INeedResource) => {
  return (nr.missingTime as number) + shrinkSpace(nr.id);
};

const updateMissing = (list: INeedResource[], elem: INeedResource): INeedResource[] => {
  const result = [...list];
  const i = list.findIndex(el => el === elem);
  return [...result.splice(i, 1), { ...elem, missing: elem.missing - 1 }];
};
