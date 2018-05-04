import { IQueryPositionDurationInternal, ITimeDurationInternal } from '@autoschedule/queries-fn';
import test, { TestContext } from 'ava';
import { isEqual } from 'intervals-fn';
import 'rxjs/add/observable/zip';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { first, map } from 'rxjs/operators';
import { IConfig } from '../data-structures/config.interface';
import { IPotentiality } from '../data-structures/potentiality.interface';
import { IPressureChunk } from '../data-structures/pressure-chunk.interface';
import { IPotRange } from '../data-structures/range.interface';
import {
  computePressure,
  computePressureChunks,
  materializePotentiality,
  updatePotentialsPressure,
} from './pipes.flow';

const potentialFactory = (
  dur: ITimeDurationInternal,
  places: IPotRange[][],
  pressure = 0,
  queryId = 42
): IPotentiality => {
  return {
    duration: { ...dur },
    isSplittable: false,
    places: [...places],
    potentialId: 1,
    pressure,
    queryId,
  };
};

const placeFactory = (range: [number, number]): IPotRange[] => {
  return [
    { end: range[1], start: range[0], kind: 'start' },
    { end: range[1], start: range[0], kind: 'end' },
  ];
};

const validatePressure = (t: TestContext, chunk: IPressureChunk, pressure: [number, number]) => {
  const message = `test chunk: ${chunk.start}-${chunk.end}`;
  t.is(chunk.pressureEnd, pressure[1], message);
  t.is(chunk.pressureStart, pressure[0], message);
};

const updatePotentialsPressureFromMats = (
  config: IConfig,
  pos: IQueryPositionDurationInternal,
  pots: IPotentiality[]
) => (materials: any) => pots.map(pot =>updatePotentialsPressure(config, pos, pot, materials));

test('will compute pressure', t => {
  let pot = potentialFactory({ min: 1, target: 1 }, [placeFactory([0, 1])]);
  t.is(computePressure(pot.duration, pot.places), 1);
  pot = potentialFactory({ min: 0, target: 1 }, [placeFactory([0, 1])]);
  t.is(computePressure(pot.duration, pot.places), 0.5);
  pot = potentialFactory({ min: 0, target: 1 }, [placeFactory([0, 2])]);
  t.is(computePressure(pot.duration, pot.places), 1 / 3);
  pot = potentialFactory({ min: 1, target: 1 }, [placeFactory([0, 2])]);
  t.is(computePressure(pot.duration, pot.places), 2 / 3);
  pot = potentialFactory({ min: 1, target: 1 }, [placeFactory([0, 1]), placeFactory([1, 2])]);
  t.is(computePressure(pot.duration, pot.places), 2 / 3);
});

test('will compute pressure chunks when no potential', t => {
  const config: IConfig = { startDate: 0, endDate: 10 };
  const pChunk = computePressureChunks(config, []);
  t.is(pChunk.length, 1);
  t.truthy(isEqual({ start: 0, end: 10 }, pChunk[0]));
  validatePressure(t, pChunk[0], [0, 0]);
});

test('will compute simple pressure chunks', t => {
  const config: IConfig = { startDate: 0, endDate: 10 };
  const pChunks = computePressureChunks(config, [
    potentialFactory({ min: 1, target: 1 }, [placeFactory([1, 2])], 1),
  ]);
  t.is(pChunks.length, 3);
  t.truthy(isEqual({ start: 0, end: 1 }, pChunks[0]));
  validatePressure(t, pChunks[0], [0, 0]);
  t.truthy(isEqual({ start: 1, end: 2 }, pChunks[1]));
  validatePressure(t, pChunks[1], [1, 1]);
  t.truthy(isEqual({ start: 2, end: 10 }, pChunks[2]));
  validatePressure(t, pChunks[2], [0, 0]);
});

test('will simplify pressure chunks', t => {
  const config: IConfig = { startDate: 0, endDate: 10 };
  const pChunkA = computePressureChunks(config, [
    potentialFactory({ min: 0, target: 1 }, [placeFactory([1, 2])], 0.5, 1),
    potentialFactory({ min: 2, target: 2 }, [placeFactory([1, 3])], 1, 2),
  ]);
  t.is(pChunkA.length, 4);
  t.truthy(isEqual({ start: 0, end: 1 }, pChunkA[0]));
  validatePressure(t, pChunkA[0], [0, 0]);
  t.truthy(isEqual({ start: 1, end: 2 }, pChunkA[1]));
  validatePressure(t, pChunkA[1], [1.5, 1.5]);
  t.truthy(isEqual({ start: 2, end: 3 }, pChunkA[2]));
  validatePressure(t, pChunkA[2], [1, 1]);
  t.truthy(isEqual({ start: 3, end: 10 }, pChunkA[3]));
  validatePressure(t, pChunkA[3], [0, 0]);

  const pChunkB = computePressureChunks(config, [
    potentialFactory({ min: 5, target: 10 }, [placeFactory([0, 10])], 0.75, 3),
  ]);
  t.is(pChunkB.length, 1);
  t.truthy(isEqual({ start: 0, end: 10 }, pChunkB[0]));
  validatePressure(t, pChunkB[0], [0.75, 0.75]);
});

test('will update potentials pressure', t => {
  const duration = { min: 2, target: 2 };
  const pot = potentialFactory(duration, [placeFactory([0, 2])], 1);
  const updated = updatePotentialsPressure(
    { startDate: 0, endDate: 2 },
    { duration },
    pot,
    [],
    [{ end: 1, start: 0 }]
  );
  t.is(updated.pressure, 2);
});

test('will materialize atomic potentiality', t => {
  const toPlace = potentialFactory(
    { min: 1, target: 1 },
    [placeFactory([0, 10])],
    0.1,
    1
  );
  const pots = [
    potentialFactory({ min: 5, target: 5 }, [placeFactory([0, 5])], 1, 2),
    potentialFactory({ min: 4, target: 4 }, [placeFactory([6, 10])], 1, 3),
  ];
  const pChunks = computePressureChunks({ startDate: 0, endDate: 10 }, pots);
  const materials = materializePotentiality(
    toPlace,
    () => pots,
    pChunks,
    new BehaviorSubject(null)
  );
  t.is(materials.length, 1);
  t.true(materials[0].start === 5 && materials[0].end === 6);
});

test('will materialize atomic within big chunk', t => {
  const toPlace = potentialFactory(
    { min: 1, target: 1 },
    [placeFactory([4, 7])],
    1
  );
  const pChunks = computePressureChunks({ startDate: 0, endDate: 10 }, []);
  const materials = materializePotentiality(toPlace, () => [], pChunks, new BehaviorSubject(null));
  t.is(materials.length, 1);
  t.is(materials[0].start, 4);
  t.is(materials[0].end, 5);
});

test('will materialize without concurrent potentials', t => {
  const toPlace = potentialFactory(
    { min: 0, target: 1 },
    [placeFactory([0, 10])],
    0.5
  );
  const pChunks = computePressureChunks({ startDate: 0, endDate: 10 }, []);
  const materials = materializePotentiality(toPlace, () => [], pChunks, new BehaviorSubject(null));
  t.is(materials.length, 1);
  t.is(materials[0].start, 0);
  t.is(materials[0].end, 1);
});

test('will materialize splittable potentiality', t => {
  const duration = { min: 1, target: 9 };
  const toPlace: IPotentiality = {
    ...potentialFactory(duration, [placeFactory([0, 10])], 0.6, 42),
    isSplittable: true,
  };
  const pots = [
    potentialFactory({ min: 5, target: 5 }, [placeFactory([3, 8])], 1, 66),
  ];
  const config = { startDate: 0, endDate: 10 };
  const pChunks = computePressureChunks(config, pots);
  const materials = materializePotentiality(
    toPlace,
    updatePotentialsPressureFromMats(config, { duration }, pots),
    pChunks,
    new BehaviorSubject(null)
  );
  t.is(materials.length, 2);
  t.true(materials[0].start === 0 && materials[0].end === 3);
  t.true(materials[1].start === 8 && materials[1].end === 10);
});

test('materialize will throw if no place available', t => {
  t.plan(1);
  const duration = { min: 5, target: 10 };
  const toPlace = potentialFactory(
    duration,
    [placeFactory([0, 10])],
    0.6
  );

  const pChunks: IPressureChunk[] = [];
  const errors1 = new BehaviorSubject(null);
  const errors2 = new BehaviorSubject(null);

  materializePotentiality(toPlace, (_) => [], pChunks, errors1);
  const pChunks2 = computePressureChunks({ startDate: 42, endDate: 52 }, []);
  materializePotentiality(toPlace, (_) => [], pChunks2, errors2);
  return Observable.zip(errors1, errors2).pipe(map(_ => t.pass('should have errors')), first());
});

test('materialize will throw if not placable without conflict', t => {
  const duration = { min: 5, target: 10 };
  const config = { startDate: 0, endDate: 10 };
  const toPlace = potentialFactory(
    duration,
    [placeFactory([0, 10])],
    0.6,
    1
  );
  const pots = [
    potentialFactory({ min: 5, target: 5 }, [placeFactory([0, 5])], 0.5, 2),
    potentialFactory({ min: 4, target: 4 }, [placeFactory([6, 10])], 0.65, 3),
  ];
  const pChunks = computePressureChunks({ startDate: 0, endDate: 10 }, pots);
  t.throws(
    materializePotentiality.bind(null, toPlace, updatePotentialsPressureFromMats(config, { duration }, pots), pChunks)
  );
});
