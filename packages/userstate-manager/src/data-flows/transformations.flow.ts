import {
  ITaskTransformInsert,
  ITaskTransformNeed,
  ITaskTransformUpdate,
  IUpdateObject,
} from '@autoschedule/queries-fn';
import { assocPath, pathOr, pipe, repeat } from 'ramda';

import { INeedResource } from '../data-structures/need-resource.interface';
import { IQueryTransfo, ITransformationTime } from '../data-structures/transformation-time.interface';

export const handleTransformations = (
  db: Loki,
  transforms: ITransformationTime,
  needResources: INeedResource[]
): INeedResource[] => {
  return handleOutputTransformations(db, transforms, [
    ...needResources,
    ...handleInputTransformations(db, transforms),
  ]).map(specifyMissingTime(transforms));
};

const specifyMissingTime = (transfo: ITransformationTime) => (
  needResource: INeedResource
): INeedResource => ({
  ...needResource,
  missingTime: needResource.missingTime ? needResource.missingTime : transfo.time,
});

const handleInputTransformations = (db: Loki, transforms: ITransformationTime): INeedResource[] => {
  if (transforms.needs == null) {
    return [];
  }
  return handleNeeds(db, transforms.needs);
};

export const handleOutputTransformations = (
  db: Loki,
  transforms: ITransformationTime,
  needResources: INeedResource[]
): INeedResource[] => {
  const newNeedResources = pipe(
    handleUpdates(db, transforms.updates),
    handleDeletes(db, transforms.deletes)
  )(needResources);
  handleInserts(db, transforms.inserts);
  return newNeedResources;
};

const handleInserts = (db: Loki, inserts: ReadonlyArray<IQueryTransfo<ITaskTransformInsert>>): void => {
  inserts.forEach(insertObj => {
    const insert = insertObj.transfo;
    const col = getOrCreateCollection(db, insert.collectionName);
    col.insert(insert.doc);
  });
};

const handleNeeds = (db: Loki, needs: ReadonlyArray<IQueryTransfo<ITaskTransformNeed>>): INeedResource[] => {
  return needs.map(needObj => {
    const need = needObj.transfo;
    const col = db.getCollection(need.collectionName);
    if (!col) {
      return {
        ...need,
        id: needObj.id,
        missing: need.quantity,
      };
    }
    const allDocs: LokiObj[] = col.find(need.find);
    const docs = allDocs.slice(0, Math.min(need.quantity, allDocs.length));
    col.remove(docs);
    return {
      ...need,
      docs,
      id: needObj.id,
      missing: need.quantity - docs.length,
    };
  });
};

const handleUpdates = (db: Loki, updates: ReadonlyArray<IQueryTransfo<ITaskTransformUpdate>>) => (
  needResources: INeedResource[]
): INeedResource[] => {
  return needResources.map(needResource => {
    const update = updates.find(u => u.transfo.ref === needResource.ref);
    if (!update) {
      return needResource;
    }
    const col = db.getCollection(needResource.collectionName);
    if (!needResource.docs) {
      return handleUpdatesFromNil(db, needResource, update.transfo);
    }
    return handleUpdate(col, needResource, update.transfo.update);
  });
};

const handleDeletes = (db: Loki, deletes: ReadonlyArray<IQueryTransfo<string>>) => (
  needResources: INeedResource[]
): INeedResource[] => {
  return needResources.map(needResource => {
    const del = deletes.find(d => d.transfo === needResource.ref);
    if (!del) {
      return needResource;
    }
    const col = db.getCollection(needResource.collectionName);
    return handleDelete(col, needResource, del.transfo);
  });
};

const handleDelete = (
  collection: Collection<any>,
  needResource: INeedResource,
  _: string
): INeedResource => {
  if (!needResource.docs) {
    return needResource;
  }
  needResource.docs.forEach(doc => collection.remove(doc));
  return { ...needResource, docs: undefined };
};

const getOrCreateCollection = (db: Loki, name: string): Collection<any> => {
  return db.getCollection(name) || db.addCollection(name);
};

const handleUpdatesFromNil = (
  db: Loki,
  need: INeedResource,
  update: ITaskTransformUpdate
): INeedResource => {
  const col = getOrCreateCollection(db, need.collectionName);
  const doc: any = update.update.reduce((obj: any, method, {}) => updateDocWithMethod({ ...obj }, method));
  return {
    ...need,
    docs: col.insert(repeat(doc, need.quantity)),
  };
};

const handleUpdate = (
  collection: Collection<any>,
  need: INeedResource,
  updates: ReadonlyArray<IUpdateObject>
): INeedResource => {
  const docs = need.docs as LokiObj[];
  const updated = docs.map(doc => updateDoc(doc, updates));
  const firsts = collection.insert(updated);
  if (need.quantity > docs.length) {
    const rests = collection.insert(repeat(cleanLokiDoc(updated[0]), need.quantity - docs.length));
    return { ...need, docs: [...firsts, ...rests] };
  }
  return { ...need, docs: firsts };
};

export const cleanLokiDoc = (doc: LokiObj): any => {
  return { ...doc, $loki: undefined, meta: undefined };
};

export const updateDoc = (doc: any, updates: ReadonlyArray<IUpdateObject>): any => {
  return updates.reduce((obj: any, update) => updateDocWithMethod(obj, update), { ...doc });
}

const updateDocWithMethod = (doc: any, method: IUpdateObject): any => {
  const path = method.property.split('.');
  if (method.arrayMethod != null) {
    const arr = [...(pathOr([], path, doc) as any[])];
    if (method.arrayMethod === 'Push') {
      return assocPath(path, [...arr, method.value], doc);
    }
    if (method.arrayMethod === 'Delete') {
      const i = arr.findIndex(v => JSON.stringify(v) === JSON.stringify(method.value));
      if (i !== -1) {
        arr.slice(i, 1);
      }
      return assocPath(path, [...arr], doc);
    }
  }
  return assocPath(path, method.value, doc);
};
