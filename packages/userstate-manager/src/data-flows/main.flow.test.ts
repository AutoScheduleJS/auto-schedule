import * as Q from '@autoschedule/queries-fn';
import test from 'ava';

import { queryToStatePotentials } from './main.flow';

import { IConfig } from '../data-structures/config.interface';
import { ITransformSatisfaction } from '../data-structures/transform-satisfaction.interface';

const shortConfig: IConfig = { startDate: 0, endDate: 5 };
const mediumConfig: IConfig = { startDate: 0, endDate: 10 };
const largeConfig: IConfig = { startDate: 0, endDate: 50 };
const hugeConfig: IConfig = { startDate: 0, endDate: 100 };
const queryToStateDB = queryToStatePotentials([]);
const shortQueryToStatePots = queryToStateDB(shortConfig);
const mediumQueryToStatePots = queryToStateDB(mediumConfig);
const largeQueryToStatePots = queryToStateDB(largeConfig);
const hugeQueryToStatePots = queryToStateDB(hugeConfig);

test('will return config when no needs', t => {
  const query = Q.queryFactory();
  const result = shortQueryToStatePots([query])(query, [], []);
  t.is(result.length, 1);
  t.is(result[0].start, 0);
  t.is(result[0].end, 5);
});

test('will run multiple simulation with same result', t => {
  const query = Q.queryFactory(
    Q.transforms([], [], [{ collectionName: 'col', doc: { test: 'test' } }])
  );
  const result1 = shortQueryToStatePots([query])(query, [], []);
  const result2 = shortQueryToStatePots([query])(query, [], []);
  const result3 = shortQueryToStatePots([query])(query, [], []);

  [result1, result2, result3].forEach(res => {
    t.is(res.length, 1);
    t.is(res[0].start, 0);
    t.is(res[0].end, 5);
    t.truthy(query.transforms && query.transforms.inserts[0].doc.$loki == null);
  });
});

test("will throw when needs aren't satisfied", t => {
  const query = Q.queryFactory(Q.transforms([Q.need(true)], [], []));
  const e: ITransformSatisfaction[] = t.throws(() => shortQueryToStatePots([])(query, [], []));
  t.true(Array.isArray(e));
  t.is(e.length, 1);
  t.is(e[0].ranges[0].start, 0);
  t.is(e[0].ranges[0].end, 5);
  const transform = e[0].transform as Q.ITaskTransformNeed;
  t.is(transform.collectionName, 'test');
});

test("will throw when one need is'nt satisfied but other are", t => {
  const query = Q.queryFactory(
    Q.duration(Q.timeDuration(1)),
    Q.transforms(
      [Q.need(true, 'titi', { response: 42 }, 1), Q.need(true, 'toto', { response: 66 }, 1)],
      [],
      []
    )
  );
  const provide = Q.queryFactory(
    Q.id(66),
    Q.transforms([], [], [{ collectionName: 'titi', doc: { response: 42 } }])
  );
  const e: ITransformSatisfaction[] = t.throws(() =>
    shortQueryToStatePots([provide, query])(
      query,
      [
        {
          duration: Q.timeDuration(1),
          isSplittable: false,
          places: [{ start: 2, end: 3 }],
          potentialId: 1,
          pressure: 1,
          queryId: 66,
        },
      ],
      []
    )
  );
  t.true(Array.isArray(e));
  t.true(e.length === 5);
  t.is(e[4].ranges[0].start, 3);
  t.is(e[4].ranges[0].end, 5);
  const transform = e[4].transform as Q.ITaskTransformNeed;
  t.is(transform.collectionName, 'toto');
});

test('will find space with matetial and potential', t => {
  const consumer = Q.queryFactory(
    Q.id(1),
    Q.name('consumer'),
    Q.start(45),
    Q.end(49),
    Q.duration(Q.timeDuration(4, 2)),
    Q.transforms([Q.need(false, 'col', { test: 'toto' }, 1, '1')], [], [])
  );
  const queries: Q.IQuery[] = [
    consumer,
    Q.queryFactory(
      Q.id(2),
      Q.name('provider'),
      Q.duration(Q.timeDuration(4, 2)),
      Q.transforms([], [], [{ collectionName: 'col', doc: { test: 'toto' }, wait: true }])
    ),
  ];
  const result = largeQueryToStatePots(queries)(
    consumer,
    [
      {
        duration: { min: 2, target: 4 },
        isSplittable: false,
        places: [{ end: 49, start: 45 }],
        potentialId: 0,
        pressure: 0.65,
        queryId: 1,
      },
    ],
    [{ end: 4, materialId: 0, queryId: 2, start: 0 }]
  );
  t.is(result.length, 1);
  t.true(result[0].start === 0);
  t.true(result[0].end === 50);
});

test('will find space where resource is available from potentiality', t => {
  const query = Q.queryFactory(
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(true, 'test', { response: 42 }, 1)], [], [])
  );
  const provide = Q.queryFactory(
    Q.id(66),
    Q.transforms([], [], [{ collectionName: 'test', doc: { response: 42 } }])
  );
  const noProvide = Q.queryFactory(Q.id(33));
  const result = shortQueryToStatePots([provide, noProvide])(
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

test('will find space where resource is available from material', t => {
  const query = Q.queryFactory(
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(true, 'test', { response: 42 }, 1)], [], [])
  );
  const provide = Q.queryFactory(
    Q.id(66),
    Q.transforms([], [], [{ collectionName: 'test', doc: { response: 42 } }])
  );
  const noProvide = Q.queryFactory(Q.id(33));
  const result = shortQueryToStatePots([provide, noProvide])(
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

test("will throw if waiting update isn't necessary", t => {
  const query = Q.queryFactory(
    Q.duration(Q.timeDuration(1)),
    Q.transforms(
      [Q.need(true, 'titi', { response: '42' }, 1, 'ref')],
      [{ ref: 'ref', update: [{ property: 'response', value: '66' }], wait: true }],
      []
    )
  );
  const provide = Q.queryFactory(
    Q.id(66),
    Q.transforms([], [], [{ collectionName: 'titi', doc: { response: '42' } }])
  );
  const e: ITransformSatisfaction[] = t.throws(() =>
    shortQueryToStatePots([provide, query])(
      query,
      [
        {
          duration: Q.timeDuration(1),
          isSplittable: false,
          places: [{ start: 2, end: 3 }],
          potentialId: 1,
          pressure: 1,
          queryId: 66,
        },
      ],
      []
    )
  );
  t.true(Array.isArray(e));
  t.true(e.length === 3);
  t.is(e[2].ranges[0].start, 0);
  t.is(e[2].ranges[0].end, 0);
  const transform = e[2].transform as Q.ITaskTransformUpdate;
  t.is(transform.ref, 'ref');
});

test('will ignore non waiting output', t => {
  const provide = Q.queryFactory(
    Q.id(66),
    Q.transforms([], [], [{ collectionName: 'test', doc: { response: '42' } }])
  );
  const query = Q.queryFactory(
    Q.duration(Q.timeDuration(1)),
    Q.transforms(
      [Q.need(true, 'test', { response: '42' }, 1, 'ref')],
      [{ ref: 'ref', update: [{ property: 'response', value: '66' }] }],
      [{ collectionName: 'test2', doc: { response: 33 } }]
    )
  );
  const result = shortQueryToStatePots([provide, query])(
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
    ],
    []
  );
  t.is(result.length, 1);
  t.true(result[0].start === 3);
  t.true(result[0].end === 5);
});

test('will find space from two providers (potentials) with space between provider', t => {
  const query = Q.queryFactory(
    Q.duration(Q.timeDuration(1)),
    Q.transforms(
      [Q.need(true, 'titi', { response: 42 }, 1), Q.need(true, 'toto', { response: 66 }, 1)],
      [],
      []
    )
  );
  const provideTiti = Q.queryFactory(
    Q.id(42),
    Q.transforms([], [], [{ collectionName: 'titi', doc: { response: 42 } }])
  );
  const provideToto = Q.queryFactory(
    Q.id(66),
    Q.transforms([], [], [{ collectionName: 'toto', doc: { response: 66 } }])
  );
  const result = mediumQueryToStatePots([provideTiti, provideToto])(
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

test('will find space from two providers (potentials) without space between provider', t => {
  const query = Q.queryFactory(
    Q.duration(Q.timeDuration(1)),
    Q.transforms(
      [Q.need(true, 'titi', { response: 42 }, 1), Q.need(true, 'toto', { response: 66 }, 1)],
      [],
      []
    )
  );
  const provideTiti = Q.queryFactory(
    Q.id(42),
    Q.transforms([], [], [{ collectionName: 'titi', doc: { response: 42 } }])
  );
  const provideToto = Q.queryFactory(
    Q.id(66),
    Q.transforms([], [], [{ collectionName: 'toto', doc: { response: 66 } }])
  );
  const result = mediumQueryToStatePots([provideTiti, provideToto, query])(
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

test("will try to works without provider's need satisfied", t => {
  const query = Q.queryFactory(
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(true, 'test', { response: '42' }, 1)], [], [])
  );
  const provide = Q.queryFactory(
    Q.id(66),
    Q.transforms(
      [Q.need(false, 'test', { response: '33' }, 1, 'ref')],
      [{ ref: 'ref', update: [{ property: 'response', value: '42' }] }],
      []
    )
  );
  const result = mediumQueryToStatePots([query, provide])(
    query,
    [
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
  t.true(result[0].start === 3);
  t.true(result[0].end === 10);
});

test("will try to works without all prover's need satisfied", t => {
  const dbObj = [{ collectionName: 'test', data: [{ response: '33' }] }];

  const query = Q.queryFactory(
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(true, 'test', { response: '42' }, 3)], [], [])
  );
  const provide = Q.queryFactory(
    Q.id(66),
    Q.transforms(
      [Q.need(false, 'test', { response: '33' }, 3, 'ref')],
      [{ ref: 'ref', update: [{ property: 'response', value: '42' }] }],
      []
    )
  );
  const result = queryToStatePotentials(dbObj)(mediumConfig)([query, provide])(
    query,
    [
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
  t.true(result[0].start === 3);
  t.true(result[0].end === 10);
});

test('will find space from potentialities without simplifying result.', t => {
  const consumer = Q.queryFactory(
    Q.id(1),
    Q.name('consumer'),
    Q.transforms([Q.need(false, 'test', { response: '33' }, 1, 'ref')], [], [])
  );
  const provider = Q.queryFactory(
    Q.id(2),
    Q.name('provider'),
    Q.transforms([], [], [{ collectionName: 'test', wait: true, doc: { response: '33' } }])
  );
  const result = largeQueryToStatePots([consumer, provider])(
    provider,
    [
      {
        duration: { min: 4, target: 4 },
        isSplittable: false,
        places: [{ end: 49, start: 37 }, { end: 35, start: 31 }, { end: 20, start: 16 }],
        potentialId: 0,
        pressure: 0.5,
        queryId: 1,
      },
    ],
    []
  );

  t.is(result.length, 3);
});

test('will find space thanks to update provider (potential)', t => {
  const dbObj = [{ collectionName: 'titi', data: [{ response: ['66'] }] }];

  const query = Q.queryFactory(
    Q.id(1),
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(true, 'titi', { response: { $contains: '42' } }, 1)], [], [])
  );
  const updateTiti = Q.queryFactory(
    Q.id(42),
    Q.transforms(
      [Q.need(false, 'titi', { response: { $contains: '66' } }, 1, 'ref')],
      [
        {
          ref: 'ref',
          update: [
            { arrayMethod: 'Delete', property: 'response', value: '66' },
            { arrayMethod: 'Push', property: 'response', value: '42' },
          ],
        },
      ],
      []
    )
  );
  const result = queryToStatePotentials(dbObj)(mediumConfig)([query, updateTiti])(
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

test("will throw when provider's waiting insert isn't needed", t => {
  const query = Q.queryFactory(
    Q.transforms([], [], [{ collectionName: 'titi', doc: { useless: true }, wait: true }])
  );
  const e: ITransformSatisfaction[] = t.throws(() => shortQueryToStatePots([])(query, [], []));
  t.true(Array.isArray(e));
  t.is(e.length, 1);
  t.is(e[0].ranges[0].start, 0);
  t.is(e[0].ranges[0].end, 0);
  const transform = e[0].transform as Q.ITaskTransformNeed;
  t.is(transform.collectionName, 'titi');
});

test("will ignore unecessary waiting update if corresponding need isn't found", t => {
  const query = Q.queryFactory(
    Q.transforms(
      [Q.need(false, 'test', { response: 42 }, 1, 'ref')],
      [{ ref: 'ref', update: [{ property: 'response', value: '66' }], wait: true }],
      []
    )
  );
  const result = shortQueryToStatePots([])(query, [], []);
  t.is(result.length, 1);
  t.is(result[0].start, 0);
  t.is(result[0].end, 5);
});

test('will not try to satisfy its own needs', t => {
  const queries: Q.IQuery[] = [
    Q.queryFactory(
      Q.id(1),
      Q.name('consumer'),
      Q.duration(Q.timeDuration(4, 2)),
      Q.transforms([Q.need(false, 'col', { test: 'toto' }, 1, '1')], [], [])
    ),
    Q.queryFactory(
      Q.id(2),
      Q.name('provider'),
      Q.duration(Q.timeDuration(4, 2)),
      Q.transforms(
        [Q.need(false, 'col', {}, 1, '1')],
        [],
        [{ collectionName: 'col', doc: { test: 'toto' }, wait: true }]
      )
    ),
  ];
  const duration = { min: 2, target: 4 };
  const result = hugeQueryToStatePots(queries)(
    queries[1],
    [
      {
        duration,
        isSplittable: false,
        places: [{ end: 100, start: 0 }],
        potentialId: 0,
        pressure: 1,
        queryId: 1,
      },
      {
        duration,
        isSplittable: false,
        places: [{ end: 98, start: 0 }],
        potentialId: 0,
        pressure: 1,
        queryId: 2,
      },
    ],
    []
  );
  t.is(result.length, 1);
  t.is(result[0].start, 0);
  t.is(result[0].end, 98);
});

test('will throw when insert more than necessary', t => {
  const query = Q.queryFactory(
    Q.id(1),
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(false, 'test', { response: '42' }, 1)], [], [])
  );
  const provider = Q.queryFactory(
    Q.transforms(
      [],
      [],
      [
        { collectionName: 'test', doc: { response: '42' }, wait: true },
        { collectionName: 'test', doc: { response: '42' }, wait: true },
      ]
    )
  );
  const e: ITransformSatisfaction[] = t.throws(() =>
    mediumQueryToStatePots([query, provider])(
      provider,
      [
        {
          duration: Q.timeDuration(1),
          isSplittable: false,
          places: [{ end: 2, start: 1 }, { end: 8, start: 7 }],
          potentialId: 1,
          pressure: 1,
          queryId: 1,
        },
      ],
      []
    )
  );
  t.true(Array.isArray(e));
  t.is(e.length, 2);
  t.is(e[0].ranges[0].start, 0);
  t.is(e[0].ranges[0].end, 1);
  t.is(e[0].ranges[1].start, 1);
  t.is(e[0].ranges[1].end, 7);
  const transform = e[0].transform as Q.ITaskTransformInsert;
  t.is(transform.collectionName, 'test');
});

test('will find space where resource is lacking that the waiting output satisfies', t => {
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
  const query7 = Q.queryFactory(
    Q.id(7),
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(false, 'titi', { response: '66' }, 1)], [], [])
  );
  const query3 = Q.queryFactory(
    Q.id(3),
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(false, 'titi', { response: '33' }, 1)], [], [])
  );
  const query4 = Q.queryFactory(
    Q.id(4),
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(false, 'toto', { response: '33' }, 1)], [], [])
  );
  const query6 = Q.queryFactory(
    Q.id(6),
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need(false, 'toto', { response: '33' }, 1)], [], [])
  );
  const query5 = Q.queryFactory(
    Q.id(5),
    Q.duration(Q.timeDuration(1)),
    Q.transforms([], [], [{ collectionName: 'toto', doc: { response: 0 } }])
  );

  const insertTiti = Q.queryFactory(
    Q.id(42),
    Q.transforms(
      [Q.need(true, 'toto', { response: 0 }, 1, 'ref')],
      [{ ref: 'ref', update: [{ property: 'response', value: '33' }], wait: true }],
      [{ collectionName: 'titi', doc: { response: '66' }, wait: true }]
    )
  );
  const result = largeQueryToStatePots([
    query1,
    query2,
    query3,
    query4,
    query5,
    query6,
    query7,
    insertTiti,
  ])(
    insertTiti,
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
        places: [{ end: 11, start: 10 }],
        potentialId: 1,
        pressure: 1,
        queryId: 7,
      },
      {
        duration: Q.timeDuration(1),
        isSplittable: false,
        places: [{ end: 9, start: 8 }],
        potentialId: 1,
        pressure: 1,
        queryId: 1,
      },
      {
        duration: Q.timeDuration(1),
        isSplittable: false,
        places: [{ end: 1, start: 0 }],
        potentialId: 1,
        pressure: 1,
        queryId: 5,
      },
      {
        duration: Q.timeDuration(1),
        isSplittable: false,
        places: [{ end: 5, start: 2 }],
        potentialId: 1,
        pressure: 1,
        queryId: 6,
      },
      {
        duration: Q.timeDuration(1),
        isSplittable: false,
        places: [{ end: 4, start: 3 }],
        potentialId: 1,
        pressure: 1,
        queryId: 4,
      },
    ],
    []
  );
  t.is(result.length, 1);
  t.is(result[0].start, 1);
  t.is(result[0].end, 3);
});
