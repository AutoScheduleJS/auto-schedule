import { queryFactory } from '@autoschedule/queries-fn';
import test from 'ava';
import * as loki from 'lokijs';

import { queryToStatePotentials } from './main.flow';

import { IConfig } from '../data-structures/config.interface';

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
