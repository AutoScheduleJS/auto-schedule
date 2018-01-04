import * as Q from '@autoschedule/queries-fn';
import test from 'ava';
import * as loki from 'lokijs';

import { queryToStatePotentials } from './main.flow';

import { IConfig } from '../data-structures/config.interface';
import { IRangeNeedSatisfaction } from '../data-structures/need-satisfaction.interface';

const baseConfig: IConfig = { startDate: 0, endDate: 5 };
const baseQueryToStatePots = queryToStatePotentials(Promise.resolve(new loki('test').serialize()))(
  baseConfig
);

test('will return config when no needs', async t => {
  const query = Q.queryFactory();
  const result = await baseQueryToStatePots([])(query, [], []);
  t.is(result.length, 1);
  t.is(result[0].start, 0);
  t.is(result[0].end, 5);
});

test("will throw when needs aren't satisfied", t => {
  const query = Q.queryFactory(Q.transforms([Q.need()], [], []));
  return baseQueryToStatePots([])(query, [], []).then(
    () => t.fail('should not pass'),
    (e: IRangeNeedSatisfaction[]) => {
      t.true(Array.isArray(e));
      t.is(e.length, 1);
      t.is(e[0].start, 0);
      t.is(e[0].end, 5);
      t.is(e[0].needsSatisfaction.length, 1);
      t.is(e[0].needsSatisfaction[0].need.collectionName, 'test');
    }
  );
});

test('will find space where resource is available', async t => {
  const query = Q.queryFactory(
    Q.duration(Q.timeDuration(1)),
    Q.transforms([Q.need('test', { response: 42 }, 1)], [], [])
  );
  const provide = Q.queryFactory(
    Q.id(66),
    Q.start(2),
    Q.end(3),
    Q.transforms([], [], [{ collectionName: 'test', doc: { response: 42 } }])
  );
  const result = await baseQueryToStatePots([provide])(
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
});
