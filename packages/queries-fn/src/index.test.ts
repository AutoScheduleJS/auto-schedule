import test from 'ava';

import * as client from './client.structures';
import * as Q from './index';

const hasBasic = (t: any, query: client.IQuery): void => {
  t.true(query.id != null);
  t.true(query.name != null);
  t.true(query.kind != null);
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
  const query = Q.queryFactory(Q.kind(client.QueryKind.Placeholder));
  hasBasic(t, query);
  t.true(query.kind === client.QueryKind.Placeholder);
});

test('will override id', t => {
  const query = Q.queryFactory(Q.id(66));
  hasBasic(t, query);
  t.true(query.id === 66);
});

test('will add timeRestriction and goal', t => {
  const query = Q.queryFactory(
    Q.timeRestrictionsHelper('hour', client.RestrictionCondition.InRange, [[0, 1]])
  );
  hasBasic(t, query);
  const hourTr =
    query.timeRestrictions && query.timeRestrictions.hour ? query.timeRestrictions.hour : false;
  t.true(
    hourTr && hourTr.condition === client.RestrictionCondition.InRange && hourTr.ranges.length === 1
  );
  t.true(query.timeRestrictions && Object.keys(query.timeRestrictions).length === 1);
});

test('will add empty transforms', t => {
  const query = Q.queryFactory(Q.transformsHelper([], [], []));
  hasBasic(t, query);
  t.true(query.transforms != null);
  t.is(query.transforms && query.transforms.needs.length, 0);
  t.is(query.transforms && query.transforms.updates.length, 0);
  t.is(query.transforms && query.transforms.inserts.length, 0);
});

test('will add needs transform', t => {
  const query = Q.queryFactory(Q.transformsHelper([Q.need()], [], []));
  hasBasic(t, query);
  t.true(query.transforms != null);
  t.is(query.transforms && query.transforms.needs.length, 1);
  t.is(query.transforms && query.transforms.needs[0].collectionName, 'test');
  t.true(query.transforms && query.transforms.needs[0].find != null);
  t.is(query.transforms && query.transforms.needs[0].quantity, 1);
  t.is(query.transforms && query.transforms.needs[0].ref, '1');
});

test('will add links', t => {
  const query = Q.queryFactory(Q.links([Q.queryLink({ min: -5, max: 0 }, 'start', 1, 0)]));
  hasBasic(t, query);
  t.true(query.links != null);
  t.is(query.links && query.links.length, 1);
  t.is(query.links && query.links[0].distance.min, -5);
  t.is(query.links && query.links[0].distance.max, 0);
  t.is(query.links && query.links[0].distance.target, undefined);
  t.is(query.links && query.links[0].potentialId, 0);
  t.is(query.links && query.links[0].queryId, 1);
  t.is(query.links && query.links[0].origin, 'start');
  t.is(query.links && query.links[0].splitId, undefined);
});

test('will set correct delete transforms', t => {
  const query = Q.queryFactory(
    Q.transformsHelper(
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

test('will sanitize query', t => {
  const query = Q.sanitize({
    id: 1,
    kind: 1,
    name: 'query',
    position: { end: undefined, start: { target: 0 }, duration: { target: 2 } },
    transforms: {
      needs: [{ collectionName: 'test', find: {}, quantity: 1, ref: 'ref', wait: false }],
    },
  });
  const query2 = Q.sanitize({
    id: 1,
    kind: 1,
    links: undefined,
    name: 'query',
    position: { start: { target: 0 }, end: { target: 2 } },
  });
  const query3 = Q.sanitize({
    id: 1,
    kind: 1,
    links: [],
    name: 'query',
    position: { start: { target: 0 }, end: { target: 2 } },
    timeRestrictions: { month: { condition: client.RestrictionCondition.InRange, ranges: [] } },
    transforms: { updates: [], inserts: [] },
  });
  const query4 = Q.sanitize({
    id: 1,
    kind: 1,
    name: 'query',
    position: { start: { target: 0 }, end: { target: 2 } },
    transforms: {
      inserts: [{}, { collectionName: 'test', doc: {} }],
      needs: [{}],
      updates: [{}, { ref: 'ref', update: {} }],
    },
  });
  t.true(query.transforms && query.transforms.deletes.length > 0);
  t.true(query3.transforms && query3.transforms.deletes.length === 0);
  t.true(
    query3.timeRestrictions &&
      query3.timeRestrictions.month &&
      query3.timeRestrictions.month.condition === client.RestrictionCondition.InRange
  );
  t.true(
    query4.transforms &&
      query4.transforms.deletes.length === 0 &&
      query4.transforms.inserts.length === 1 &&
      query4.transforms.updates.length === 1
  );
  t.false(Object.getOwnPropertyNames(query).some(p => p === 'end'));
  t.false(Object.getOwnPropertyNames(query2).some(p => p === 'transform'));
});

test('Will throw when invalid position', t => {
  t.throws(
    () =>
      Q.sanitize({
        id: 1,
        kind: 1,
        name: 'query',
        position: { start: { target: 0 }, end: undefined },
      }),
    'Invalid position'
  );
});
