import {
  ITaskTransformInsert,
  ITaskTransformNeed,
  ITaskTransformUpdate,
  ITransformation,
  IUpdateObject,
} from '@autoschedule/queries-fn';
import { assocPath, pathOr, repeat } from 'ramda';

import { INeedResource } from '../data-structures/need-resource.interface';

export const handleTransformations = (db: Loki, transform: ITransformation[]): void => {
  transform.forEach(tr => {
    const needResources = handleNeeds(db, tr.needs);
    handleUpdatesAndDelete(db, needResources, tr.updates);
    handleInserts(db, tr.inserts);
  });
  return;
};

const handleInserts = (db: Loki, inserts: ReadonlyArray<ITaskTransformInsert>): void => {
  inserts.forEach(insert => {
    const col = getOrCreateCollection(db, insert.collectionName);
    col.insert(insert.doc);
  });
}

const handleNeeds = (db: Loki, needs: ReadonlyArray<ITaskTransformNeed>): INeedResource[] => {
  return needs.map(need => {
    const col = db.getCollection(need.collectionName);
    if (!col) {
      return need;
    }
    const docs: LokiObj[] = col.find(need.find);
    return {
      ...need,
      docs: docs.slice(0, Math.min(need.quantity, docs.length)),
    };
  });
};

const handleUpdatesAndDelete = (
  db: Loki,
  needResources: INeedResource[],
  updates: ReadonlyArray<ITaskTransformUpdate>
): void => {
  needResources.forEach(needResource => {
    const update = updates.find(u => u.ref === needResource.ref);
    const col = db.getCollection(needResource.collectionName);
    if (update == null) {
      return handleDelete(col, needResource.docs);
    }
    if (!needResource.docs) {
      return handleUpdatesFromNil(db, needResource, update);
    }
    handleUpdate(col, needResource, update.update);
  });
};

const handleDelete = (collection: Collection<any>, docs: LokiObj[] | undefined): void => {
  if (!docs) {
    return;
  }
  docs.forEach(doc => collection.remove(doc));
};

const getOrCreateCollection = (db: Loki, name: string): Collection<any> => {
  return db.getCollection(name) || db.addCollection(name);
}

const handleUpdatesFromNil = (
  db: Loki,
  need: ITaskTransformNeed,
  update: ITaskTransformUpdate
): void => {
  const col = getOrCreateCollection(db, need.collectionName);
  const doc: any = update.update.reduce((obj: any, method, {}) => updateDoc({ ...obj }, method));
  col.insert(repeat(doc, need.quantity));
};

const handleUpdate = (
  collection: Collection<any>,
  need: INeedResource,
  updates: ReadonlyArray<IUpdateObject>
): void => {
  const docs = need.docs as LokiObj[];
  const updated = docs.map(doc =>
    updates.reduce((obj: any, update) => updateDoc(obj, update), { ...doc })
  );
  collection.update(updated);
  if (need.quantity > docs.length) {
    collection.insert(repeat(cleanLokiDoc(updated[0]), need.quantity - docs.length));
  }
};

const cleanLokiDoc = (doc: LokiObj): any => {
  return { ...doc, $loki: undefined, meta: undefined };
}

const updateDoc = (doc: any, method: IUpdateObject): any => {
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
