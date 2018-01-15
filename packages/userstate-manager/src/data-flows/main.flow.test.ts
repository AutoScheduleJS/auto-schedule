import * as Q from '@autoschedule/queries-fn';
import test from 'ava';
import * as loki from 'lokijs';

import { queryToStatePotentials } from './main.flow';

import { IConfig } from '../data-structures/config.interface';
import { ITransformSatisfaction } from '../data-structures/transform-satisfaction.interface';

const shortConfig: IConfig = { startDate: 0, endDate: 5 };
const mediumConfig: IConfig = { startDate: 0, endDate: 10 };
const queryToStateDB = queryToStatePotentials(Promise.resolve(new loki('test').serialize()));
const shortQueryToStatePots = queryToStateDB(shortConfig);
const mediumQueryToStatePots = queryToStateDB(mediumConfig);

test('will return config when no needs', async t => {
  const query = Q.queryFactory();
  const result = await shortQueryToStatePots([])(query, [], []);
  t.is(result.length, 1);
  t.is(result[0].start, 0);
  t.is(result[0].end, 5);
});

test("will throw when needs aren't satisfied", t => {
  const query = Q.queryFactory(Q.transforms([Q.need(true)], [], []));
  return shortQueryToStatePots([])(query, [], []).then(
    () => t.fail('should not pass'),
    (e: ITransformSatisfaction[]) => {
      t.true(Array.isArray(e));
      t.is(e.length, 1);
      t.is(e[0].range.start, 0);
      t.is(e[0].range.end, 5);
      const transform = e[0].transform as Q.ITaskTransformNeed;
      t.is(transform.collectionName, 'test');
    }
  );
});

test('will find space where resource is available from potentiality', async t => {
  const query = Q.queryFactory(
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(true, 'test', { response: 42 }, 1)], [], [])
  );
  const provide = Q.queryFactory(
    Q.id(66),
    Q.transforms([], [], [{ collectionName: 'test', doc: { response: 42 } }])
  );
  const noProvide = Q.queryFactory(Q.id(33));
  const result = await shortQueryToStatePots([provide, noProvide])(
    query,
    [
      {
        duration: Q.timeDuration(1),
        isSplittable: false,
        places: [{ end: 3, start: 2 }],
        potentialId: 1,
        pressure: 1,
        queryId: 66,
      },
      {
        duration: Q.timeDuration(1),
        isSplittable: false,
        places: [{ start: 0, end: 2 }],
        potentialId: 2,
        pressure: 0.5,
        queryId: 33,
      },
    ],
    []
  );
  t.is(result.length, 1);
  t.true(result[0].start === 3);
  t.true(result[0].end === 5);
});

test('will find space where resource is available from material', async t => {
  const query = Q.queryFactory(
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(true, 'test', { response: 42 }, 1)], [], [])
  );
  const provide = Q.queryFactory(
    Q.id(66),
    Q.transforms([], [], [{ collectionName: 'test', doc: { response: 42 } }])
  );
  const noProvide = Q.queryFactory(Q.id(33));
  const result = await shortQueryToStatePots([provide, noProvide])(
    query,
    [],
    [
      {
        end: 3,
        materialId: 1,
        queryId: 66,
        start: 2,
      },
      {
        end: 2,
        materialId: 2,
        queryId: 33,
        start: 0,
      },
    ]
  );
  t.is(result.length, 1);
  t.true(result[0].start === 3);
  t.true(result[0].end === 5);
});

test('will find space from two providers (potentials) with space between provider', async t => {
  const query = Q.queryFactory(
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(true, 'titi', { response: 42 }, 1), Q.need(true, 'toto', { response: 66 }, 1)], [], [])
  );
  const provideTiti = Q.queryFactory(
    Q.id(42),
    Q.transforms([], [], [{ collectionName: 'titi', doc: { response: 42 } }])
  );
  const provideToto = Q.queryFactory(
    Q.id(66),
    Q.transforms([], [], [{ collectionName: 'toto', doc: { response: 66 } }])
  );
  const result = await mediumQueryToStatePots([provideTiti, provideToto])(
    query,
    [
      {
        duration: Q.timeDuration(1),
        isSplittable: false,
        places: [{ end: 3, start: 2 }],
        potentialId: 1,
        pressure: 1,
        queryId: 42,
      },
      {
        duration: Q.timeDuration(1),
        isSplittable: false,
        places: [{ start: 6, end: 8 }],
        potentialId: 2,
        pressure: 0.5,
        queryId: 66,
      },
    ],
    []
  );
  t.is(result.length, 1);
  t.true(result[0].start === 8);
  t.true(result[0].end === 10);
});

test('will find space from two providers (potentials) without space between provider', async t => {
  const query = Q.queryFactory(
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(true, 'titi', { response: 42 }, 1), Q.need(true, 'toto', { response: 66 }, 1)], [], [])
  );
  const provideTiti = Q.queryFactory(
    Q.id(42),
    Q.transforms([], [], [{ collectionName: 'titi', doc: { response: 42 } }])
  );
  const provideToto = Q.queryFactory(
    Q.id(66),
    Q.transforms([], [], [{ collectionName: 'toto', doc: { response: 66 } }])
  );
  const result = await mediumQueryToStatePots([provideTiti, provideToto])(
    query,
    [
      {
        duration: Q.timeDuration(1),
        isSplittable: false,
        places: [{ end: 4, start: 2 }],
        potentialId: 1,
        pressure: 0.5,
        queryId: 42,
      },
      {
        duration: Q.timeDuration(1),
        isSplittable: false,
        places: [{ start: 1, end: 3 }],
        potentialId: 2,
        pressure: 0.5,
        queryId: 66,
      },
    ],
    []
  );
  t.is(result.length, 1);
  t.true(result[0].start === 4);
  t.true(result[0].end === 10);
});

test('will find space thanks to update provider (potential)', async t => {
  const db = new loki('test_update');
  db.addCollection('titi').insert({ response: '66' });

  const query = Q.queryFactory(
    Q.id(1),
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(true, 'titi', { response: '42' }, 1)], [], [])
  );
  const updateTiti = Q.queryFactory(
    Q.id(42),
    Q.transforms(
      [Q.need(false, 'titi', { response: '66' }, 1, 'ref')],
      [{ ref: 'ref', update: [{ property: 'response', value: '42' }] }],
      []
    )
  );
  const result = await queryToStatePotentials(Promise.resolve(db.serialize()))(mediumConfig)([
    query,
    updateTiti,
  ])(
    query,
    [
      {
        duration: Q.timeDuration(1),
        isSplittable: false,
        places: [{ end: 4, start: 2 }],
        potentialId: 1,
        pressure: 0.5,
        queryId: 42,
      },
    ],
    []
  );
  t.is(result.length, 1);
  t.is(result[0].start, 4);
  t.is(result[0].end, 10);
});

test("will throw when provider's output (in wait mode) isn't needed", t => {
  const query = Q.queryFactory(
    Q.transforms([], [], [{ collectionName: 'titi', doc: { useless: true }, wait: true }])
  );
  return shortQueryToStatePots([])(query, [], []).then(
    () => t.fail('should not pass'),
    (e: ITransformSatisfaction[]) => {
      t.true(Array.isArray(e));
      t.is(e.length, 1);
      t.is(e[0].range.start, 0);
      t.is(e[0].range.end, 0);
      const transform = e[0].transform as Q.ITaskTransformNeed;
      t.is(transform.collectionName, 'titi');
    }
  );
});

test('will find space where resource (in wait mode) is lacking', async t => {
  const query1 = Q.queryFactory(
    Q.id(1),
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(false, 'titi', { response: '42' }, 1)], [], [])
  );
  const query2 = Q.queryFactory(
    Q.id(2),
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(false, 'titi', { response: '66' }, 1)], [], [])
  );
  const query3 = Q.queryFactory(
    Q.id(3),
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(false, 'titi', { response: '33' }, 1)], [], [])
  );
  const updateTiti = Q.queryFactory(
    Q.id(42),
    Q.transforms([], [], [{ collectionName: 'titi', doc: { response: '66' }, wait: true }])
  );
  const result = await mediumQueryToStatePots([query1, query2, query3, updateTiti])(
    updateTiti,
    [
      {
        duration: Q.timeDuration(1),
        isSplittable: false,
        places: [{ end: 5, start: 4 }],
        potentialId: 1,
        pressure: 1,
        queryId: 1,
      },
      {
        duration: Q.timeDuration(1),
        isSplittable: false,
        places: [{ end: 7, start: 6 }],
        potentialId: 1,
        pressure: 1,
        queryId: 2,
      },
      {
        duration: Q.timeDuration(1),
        isSplittable: false,
        places: [{ end: 9, start: 8 }],
        potentialId: 1,
        pressure: 1,
        queryId: 1,
      },

    ],
    []
  );
  t.is(result.length, 1);
  t.is(result[0].start, 0);
  t.is(result[0].end, 6);
});
