import { need, queryFactory, transforms } from '@autoschedule/queries-fn';
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
  const query = queryFactory();
  const result = await baseQueryToStatePots([])(query, [], []);
  t.is(result.length, 1);
  t.is(result[0].start, 0);
  t.is(result[0].end, 5);
});

test("will throw when needs aren't satisfied", async t => {
  const query = queryFactory(transforms([need()], [], []));
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
