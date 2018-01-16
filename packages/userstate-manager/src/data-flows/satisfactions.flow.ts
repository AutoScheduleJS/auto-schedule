import {
  ITaskTransformInsert,
  ITaskTransformNeed,
  ITaskTransformUpdate,
  ITransformation,
} from '@autoschedule/queries-fn';
import { IRange } from '@autoschedule/queries-scheduler';
import * as loki from 'lokijs';
import { times } from 'ramda';

import { IIdentifier } from '../data-structures/identifier.interface';
import { INeedResource } from '../data-structures/need-resource.interface';
import {
  INeedSatisfaction,
  IRangeNeedSatisfaction,
} from '../data-structures/need-satisfaction.interface';
import { IRefDoc } from '../data-structures/ref-doc.interface';
import { ITransformSatisfaction } from '../data-structures/transform-satisfaction.interface';
import { ITransformationTime } from '../data-structures/transformation-time.interface';

import { cleanLokiDoc, handleTransformations, updateDoc } from './transformations.flow';

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
  shrinkSpace: (id: IIdentifier) => number
): ITransformSatisfaction[] => {
  const nrToMT = needResourceToMissingTime(shrinkSpace);
  const db = new loki('satis');
  const docMatchFind = docMatchFindFromCol(db.addCollection('test'));
  const [outputSatisUpdate, newNeedRes] = computeUpdateSatisfaction(
    config,
    docMatchFind,
    nrToMT,
    needResources,
    transforms.updates,
    queryDocs
  )
  const outputSatisInsert = computeInsertSatisfaction(
    config,
    docMatchFind,
    nrToMT,
    newNeedRes,
    transforms.inserts
  );
  return [...outputSatisInsert, ...outputSatisUpdate];
};

const docMatchFindFromCol = (col: Collection<any>) => (doc: any, find: any) => {
  col.clear();
  col.insert(cleanLokiDoc(doc));
  return col.find(find);
};

const computeUpdateSatisfaction = (
  configRange: IRange,
  docMatchFind: (doc: any, find: any) => any[],
  nrToMT: (nr: INeedResource) => number,
  needResources: INeedResource[],
  updates: ReadonlyArray<ITaskTransformUpdate>,
  queryDocs: IRefDoc[]
): [ITransformSatisfaction[], INeedResource[]] => {
  const outputSatis: ITransformSatisfaction[] = [];
  let newNeedResources = [...needResources];

  times(updateI => {
    const update = updates[updateI];
    const docRef = queryDocs.find(qd => qd.ref === update.ref);
    if (!update.wait || !docRef) {
      return outputSatis.push({ transform: update, range: configRange });
    }
    return docRef.docs.forEach(doc => {
      const insert = {
        collectionName: docRef.collectionName,
        doc: updateDoc(doc, update.update),
      };
      const allNR = satisfiedFromInsertNeedResources(insert, newNeedResources, docMatchFind);
      if (!allNR.length) {
        return outputSatis.push({ transform: update, range: { start: 0, end: 0 } });
      }
      const minNR = allNR.reduce((a, b) => (nrToMT(a) < nrToMT(b) ? a : b));
      const range: IRange = {
        end: nrToMT(minNR),
        start: configRange.start,
      };
      newNeedResources = updateMissing(newNeedResources, minNR);
      return outputSatis.push({ range, transform: update });
    });
  }, updates.length);
  return [outputSatis, newNeedResources];
};

const computeInsertSatisfaction = (
  configRange: IRange,
  docMatchFind: (doc: any, find: any) => any[],
  nrToMT: (nr: INeedResource) => number,
  needResources: INeedResource[],
  inserts: ReadonlyArray<ITaskTransformInsert>
): ITransformSatisfaction[] => {
  const outputSatis: ITransformSatisfaction[] = [];
  let newNeedResources = [...needResources];

  times(insertI => {
    const insert = inserts[insertI];
    if (!insert.wait) {
      return outputSatis.push({ transform: insert, range: configRange });
    }
    const allNR = satisfiedFromInsertNeedResources(insert, newNeedResources, docMatchFind);
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
  return outputSatis;
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

const needResourceToMissingTime = (shrinkSpace: (id: IIdentifier) => number) => (nr: INeedResource) => {
  return (nr.missingTime[0] as number) + shrinkSpace(nr.id);
};

const updateMissing = (list: INeedResource[], elem: INeedResource): INeedResource[] => {
  const result = [...list];
  const i = list.findIndex(el => el === elem);
  result.splice(i, 1);
  return [...result, { ...elem, missing: elem.missing - 1 }];
};
