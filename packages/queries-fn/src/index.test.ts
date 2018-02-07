import test from 'ava';
import { has } from 'ramda';

import { IAtomicQuery, IGoalQuery, IProviderQuery } from './data.structures';
import * as Q from './index';

const hasBasic = (t: any, query: Q.IQuery): void => {
  t.true(has('id', query));
  t.true(has('name', query));
  t.true(has('kind', query));
};

test('will create default query', t => {
  const query = Q.queryFactory();
  hasBasic(t, query);
});

test('will override name', t => {
  const query = Q.queryFactory(Q.name('test'));
  hasBasic(t, query);
  t.true(query.name === 'test');
});

test('will override kind', t => {
  const query = Q.queryFactory(Q.kind(Q.QueryKind.Placeholder));
  hasBasic(t, query);
  t.true(query.kind === Q.QueryKind.Placeholder);
});

test('will override id', t => {
  const query = Q.queryFactory(Q.id(66));
  hasBasic(t, query);
  t.true(query.id === 66);
});

test('will add start', t => {
  const query1 = Q.queryFactory<IAtomicQuery>(Q.start(2));
  const query2 = Q.queryFactory<IAtomicQuery>(Q.start(2, 1));
  hasBasic(t, query1);
  hasBasic(t, query2);
  t.true(
    query1.start && query1.start.min === 2 && query1.start.max === 2 && query1.start.target === 2
  );
  t.true(
    query2.start && query2.start.min === 1 && query2.start.max === 2 && query2.start.target === 2
  );
});

test('will add end', t => {
  const query1 = Q.queryFactory<IAtomicQuery>(Q.end(2));
  const query2 = Q.queryFactory<IAtomicQuery>(Q.end(2, 1));
  hasBasic(t, query1);
  hasBasic(t, query2);
  t.true(query1.end && query1.end.min === 2 && query1.end.max === 2 && query1.end.target === 2);
  t.true(query2.end && query2.end.min === 1 && query2.end.max === 2 && query2.end.target === 2);
});

test('will add duration', t => {
  const query1 = Q.queryFactory<IAtomicQuery>(Q.duration(Q.timeDuration(2)));
  const query2 = Q.queryFactory<IAtomicQuery>(Q.duration(Q.timeDuration(2, 1)));
  hasBasic(t, query1);
  hasBasic(t, query2);
  t.true(query1.duration && query1.duration.min === 2 && query1.duration.target === 2);
  t.true(query2.duration && query2.duration.min === 1 && query2.duration.target === 2);
});

test('will add timeRestriction and goal', t => {
  const query = Q.queryFactory<IGoalQuery>(
    Q.timeRestrictions('hour', Q.RestrictionCondition.InRange, [[0, 1]]),
    Q.goal(Q.GoalKind.Atomic, Q.timeDuration(1), 10)
  );
  hasBasic(t, query);
  const hourTr =
    query.timeRestrictions && query.timeRestrictions.hour ? query.timeRestrictions.hour : false;
  t.true(
    hourTr && hourTr.condition === Q.RestrictionCondition.InRange && hourTr.ranges.length === 1
  );
  t.true(query.timeRestrictions && Object.keys(query.timeRestrictions).length === 1);
  t.true(
    query.goal.kind === Q.GoalKind.Atomic &&
      query.goal.quantity.target === 1 &&
      query.goal.time === 10
  );
});

test('will add empty transforms', t => {
  const query = Q.queryFactory(Q.transforms([], [], []));
  hasBasic(t, query);
  t.true(query.transforms != null);
  t.is(query.transforms && query.transforms.needs.length, 0);
  t.is(query.transforms && query.transforms.updates.length, 0);
  t.is(query.transforms && query.transforms.inserts.length, 0);
});

test('will add needs transform', t => {
  const query = Q.queryFactory(Q.transforms([Q.need()], [], []));
  hasBasic(t, query);
  t.true(query.transforms != null);
  t.is(query.transforms && query.transforms.needs.length, 1);
  t.is(query.transforms && query.transforms.needs[0].collectionName, 'test');
  t.true(query.transforms && query.transforms.needs[0].find != null);
  t.is(query.transforms && query.transforms.needs[0].quantity, 1);
  t.is(query.transforms && query.transforms.needs[0].ref, '1');
});

test('will set correct delete transforms', t => {
  const query = Q.queryFactory(
    Q.transforms(
      [Q.need(true, 'a', {}, 1, 'aa'), Q.need(false, 'b', {}, 1, 'bb')],
      [{ ref: 'aa', update: [] }],
      []
    )
  );
  hasBasic(t, query);
  t.true(query.transforms != null);
  t.is(query.transforms && query.transforms.deletes.length, 1);
  t.is(query.transforms && query.transforms.deletes[0], 'bb');
});

test('will typeguard goal query', t => {
  const query = Q.queryFactory(Q.goal(Q.GoalKind.Atomic, Q.timeDuration(1), 1));
  t.false(Q.isAtomicQuery(query));
  t.false(Q.isProviderQuery(query));
  t.true(Q.isGoalQuery(query));
});

test('will typeguard provider query', t => {
  const query = Q.queryFactory<Q.IProviderQuery>(
    Q.timeRestrictions('hour', Q.RestrictionCondition.InRange, [[0, 1]]),
    Q.transforms([], [], [])
  );
  t.false(Q.isAtomicQuery(query));
  t.true(Q.isProviderQuery(query));
  t.false(Q.isGoalQuery(query));
});

test('will typeguard atomic query without transforms', t => {
  const query = Q.queryFactory(Q.start(1), Q.end(2));
  t.true(Q.isAtomicQuery(query));
  t.false(Q.isProviderQuery(query));
  t.false(Q.isGoalQuery(query));
});

test('will typeguard atomic query with transforms', t => {
  const query = Q.queryFactory(Q.start(1), Q.end(2), Q.transforms([], [], []));
  t.true(Q.isAtomicQuery(query));
  t.true(Q.isProviderQuery(query));
  t.false(Q.isGoalQuery(query));
});

test('will sanitize query', t => {
  const query: IAtomicQuery & IProviderQuery = Q.sanitize({
    end: undefined,
    id: 1,
    kind: 1,
    name: 'query',
    start: { target: 0 },
    transforms: { needs: [{ collectionName: 'test', find: {}, quantity: 1, ref: 'ref', wait: false }] },
  });
  const query2: IAtomicQuery & IProviderQuery = Q.sanitize({
    id: 1,
    kind: 1,
    name: 'query',
  });
  const query3: IAtomicQuery & IProviderQuery = Q.sanitize({
    id: 1,
    kind: 1,
    name: 'query',
    transforms: { update: [], insert: [] },
  });
  t.true(query.transforms && query.transforms.deletes.length > 0);
  t.true(query3.transforms && query3.transforms.deletes.length === 0);
  t.false(Object.getOwnPropertyNames(query).some(p => p === 'end'));
  t.false(Object.getOwnPropertyNames(query2).some(p => p === 'transform'));
});
