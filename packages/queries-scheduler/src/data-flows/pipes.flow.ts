import { IQueryPositionDurationInternal, ITimeDurationInternal } from '@autoschedule/queries-fn';
import { intersect, merge, substract } from 'intervals-fn';
import * as R from 'ramda';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { IConfig } from '../data-structures/config.interface';
import { ConflictError } from '../data-structures/conflict.error';
import { IMaterial } from '../data-structures/material.interface';
import {
  IPotentiality,
  IPotentialityBase,
  IPotentialitySimul,
} from '../data-structures/potentiality.interface';
import {
  IAreaPressureChunk,
  IPressureChunk,
  IPressureChunkMerge,
} from '../data-structures/pressure-chunk.interface';
import { IPotRange, IRange } from '../data-structures/range.interface';
import { atomicToPlaces } from './queries.flow';
import {
  areSameNumber,
  asymptotTo,
  configToRange,
  fillLimitedArray,
  getYfromStartEndLine,
  sortByStart,
  withinRange,
} from './util.flow';

const computePressureWithSpace = (duration: ITimeDurationInternal, space: number): number => {
  const min = duration.min / space;
  if (min >= 1) {
    return min;
  }
  return min + asymptotTo(1 - min)(duration.target / space);
};

const filterPlaceForPressure = (place: IPotRange) =>
  ['start', 'end', 'start-before', 'end-after'].includes(place.kind);

const filterPlaceForStart = (place: IPotRange) =>
  ['start', 'start-before', 'start-after'].includes(place.kind);

const filterPlaceForEnd = (place: IPotRange) =>
  ['end', 'end-before', 'end-after'].includes(place.kind);

export const placeToRange = (place: ReadonlyArray<IPotRange>): IRange => {
  const points = place
    .filter(filterPlaceForPressure)
    .map(c => {
      if (c.kind.startsWith('start')) {
        return c.start;
      }
      return c.end;
    })
    .sort((a, b) => a - b);
  return {
    end: points[1],
    start: points[0],
  };
};

const placeToMaxDuration = (place: ReadonlyArray<IPotRange>): number => {
  const range = placeToRange(place);
  return range.end - range.start;
};

/**
 * How to compute pressure ? start/end/target or only target
 */
export const computePressure = (
  duration: ITimeDurationInternal,
  places: ReadonlyArray<ReadonlyArray<IPotRange>>
): number => {
  const space = R.sum(places.map(placeToMaxDuration));
  return computePressureWithSpace(duration, space);
};

/**
 * TODO: use IRange with pressureStart - pressureEnd
 *    A   B   C    D   E
 *          ______
 * |_____|/|      |\|_____|
 * push:         \
 *                     \
 * impact 3 pressureChunk: C, D, E
 * with sortByStart, should only impact C.
 * startMin & endMax should be normalized: { startPressure: 0, endPressure: diff }
 *   A      B
 * |   |       /|
 * |___|/       |
 * push:
 *         \
 *                   \
 * impact 1 pressureChunk: B
 * result in: (max 3 chunks, min 1 chunk)
 * 1   2   3    4      5
 * |   |   |____|      |
 * |___|/  |    |\     |
 * |   |   |    |     \|
 * need to compute pressure at 3, 4, 5
 * 3 & 4: compute press at specific point for pushed IRange & add pressure from terminal point.
 */
export const computePressureChunks = (
  config: IConfig,
  potentialities: IPotentiality[]
): IPressureChunk[] => {
  return sortByStart(
    R.unnest(
      potentialities.map(pot =>
        R.unnest(pot.places)
          .filter(filterPlaceForPressure)
          .map(placeToPressureChunk(pot.pressure))
      )
    )
  ).reduce(reducePlaceToPressureChunk, [
    {
      ...configToRange(config),
      originalRange: configToRange(config),
      pressureEnd: 0,
      pressureStart: 0,
    },
  ]);
};

const placeToPressureChunk = (pressure: number) => (place: IPotRange): IPressureChunkMerge => {
  return {
    end: place.end,
    originalRange: { start: place.start, end: place.end },
    pressureEnd: place.kind === 'end-after' ? 0 : pressure,
    pressureStart: place.kind === 'start-before' ? 0 : pressure,
    start: place.start,
  };
};

const reducePlaceToPressureChunk = (
  acc: IPressureChunkMerge[],
  cur: IPressureChunkMerge
): IPressureChunkMerge[] => {
  return merge(
    (chunks: IPressureChunkMerge[]) => {
      if (chunks.length === 1) {
        return chunks[0];
      }
      return chunks.reduce((a, b) => {
        const maxStart = a.start > b.start ? a : b;
        const minEnd = a.end < b.end ? a : b;
        return {
          ...a,
          originalRange: { start: maxStart.start, end: minEnd.end },
          pressureEnd: getYfromStartEndLine(chunkToSeg(maxStart), minEnd.end) + minEnd.pressureEnd,
          pressureStart:
            getYfromStartEndLine(chunkToSeg(minEnd), maxStart.start) + maxStart.pressureStart,
        };
      });
    },
    [...acc, cur]
  );
};

const chunkToSeg = (chunk: IPressureChunkMerge) => ({
  end: {
    x: chunk.originalRange.end,
    y: chunk.pressureEnd,
  },
  start: {
    x: chunk.originalRange.start,
    y: chunk.pressureStart,
  },
});

export const updatePotentialsPressure = (
  config: IConfig,
  position: IQueryPositionDurationInternal,
  potentiality: IPotentiality,
  materials: ReadonlyArray<IMaterial>,
  ...masks: IRange[][]
): IPotentiality => {
  const boundaries = substract(
    masks.reduce((a, b) => intersect(b, a), [configToRange(config)]),
    materials
  );
  const places = boundaries.map(bounds => atomicToPlaces(bounds, position));
  const pressure = computePressure(potentiality.duration, places);
  return {
    ...potentiality,
    places,
    pressure,
  };
};

const isProgressing = (progress: number[]): boolean => {
  return (
    (progress.length === 1 ||
      !R.reduceWhile(
        ({ similar }, _) => similar,
        ({ similar, value }, cur) => ({
          similar: similar && Math.abs(value - cur) < 0.05,
          value: cur,
        }),
        { similar: true, value: progress[0] },
        progress
      ).similar) &&
    (R.last(progress) as number) > 0.1
  );
};

const maxPlaceAvailable = (pot: IPotentiality) =>
  pot.places.map(placeToMaxDuration).reduce(R.max, 0);

const stopSearchFn = () => {
  let lastProgress: boolean[] = [];
  const fillProgress = fillLimitedArray<boolean>(3);
  return (progress: boolean, avgPressure: number) => {
    lastProgress = fillProgress(lastProgress, progress);
    if (!progress && avgPressure <= 1) {
      return true;
    }
    return avgPressure > 1 && lastProgress.every(p => !p);
  };
};

const findMaxFinitePlacement = (
  toPlace: IPotentiality,
  updatePP: (m: IMaterial[]) => IPotentiality[],
  pressure: IPressureChunk[],
  error$: BehaviorSubject<any>
): IMaterial[] => {
  const minDur = toPlace.duration.min;
  const fillArray = fillLimitedArray<number>(3);
  const maxTest = maxPlaceAvailable(toPlace);
  const minTestDur = (dur: number) => Math.min(Math.floor(dur), maxTest);
  const stopSearch = stopSearchFn();
  let lastProgress: number[] = [];
  let durationDelta = toPlace.duration.target - minDur;
  let testDuration = minTestDur(minDur + durationDelta / 2);
  let avgPre: number = 0;
  let myPre: number = 0;
  let materials: IMaterial[] = [];
  let pots: IPotentiality[] = [];
  do {
    materials = simulatePlacement({ ...toPlace, duration: testDuration }, pressure);
    pots = updatePP(materials);
    avgPre = potentialsToMeanPressure(pots);
    myPre = computePressureWithSpace(
      { min: minDur, target: testDuration },
      maxPlaceAvailable(toPlace)
    );
    durationDelta /= 1.8;
    let factor = avgPre > myPre ? 1 : -1;
    if (avgPre > 1) {
      factor *= -1;
    }
    testDuration = minTestDur(testDuration + factor * durationDelta);
    lastProgress = fillArray(lastProgress, Math.abs(avgPre - myPre));
  } while (!stopSearch(isProgressing(lastProgress), avgPre));
  const err: IMaterial[] = [];
  if (!materials.length || !validatePotentials(pots)) {
    error$.next(new ConflictError(toPlace.queryId)); // Throw pots with pressure > 1
    return err;
  }
  return materials;
};

export const materializePotentiality = (
  toPlace: IPotentiality,
  updatePP: (m: IMaterial[]) => IPotentiality[],
  pressure: IPressureChunk[],
  error$: BehaviorSubject<any>
): IMaterial[] => {
  const minMaterials = simulatePlacement(potToSimul('min', toPlace), pressure);
  const maxMaterials = simulatePlacement(potToSimul('target', toPlace), pressure);
  if (!minMaterials.length && !maxMaterials.length) {
    error$.next(new ConflictError(toPlace.queryId));
    return [];
  }
  const minPots = updatePP(minMaterials);
  const maxPots = updatePP(maxMaterials);
  const minAvg = potentialsToMeanPressure(minPots);
  const maxAvg = potentialsToMeanPressure(maxPots);
  if (maxMaterials.length && areSameNumber(0.1)(minAvg, maxAvg)) {
    if (validatePotentials(minPots)) {
      return maxMaterials;
    }
    error$.next(new ConflictError(toPlace.queryId)); // use pots with > 1 pressure
    return [];
  }
  return findMaxFinitePlacement(toPlace, updatePP, pressure, error$);
};

export const computePressureArea = (pressureChunk: IPressureChunk): number => {
  const A = { y: pressureChunk.pressureStart, x: pressureChunk.start };
  const B = { y: pressureChunk.pressureEnd, x: pressureChunk.end };
  const C = { x: pressureChunk.end };
  const D = { x: pressureChunk.start };
  return Math.abs(A.x * B.y - A.y * B.x - B.y * C.x + D.x * A.y);
};

const rangeToDuration = (range: IRange): number => {
  return range.end - range.start;
};
const firstTimeRange = (ranges: IRange[]): number =>
  ranges.reduce((a, b) => (b.start < a ? b.start : a), Infinity);
const lastTimeRange = (ranges: IRange[]): number =>
  ranges.reduce((a, b) => (b.end > a ? b.end : a), -Infinity);
const scanPressure = (acc: number, curr: IAreaPressureChunk) => acc + curr.areaPressure;

const divideChunkByDuration = (duration: number) => (chunk: IPressureChunk): IRange[] => {
  return [
    { start: chunk.start, end: chunk.start + duration },
    { end: chunk.end, start: chunk.end - duration },
  ];
};

const pressureChunkToAreaPressure = (chunk: IPressureChunk): IAreaPressureChunk => ({
  areaPressure: computePressureArea(chunk),
  end: chunk.end,
  start: chunk.start,
});

const rangeChunkIntersectin = (chunks: IPressureChunk[]) => (
  range: IRange
): IAreaPressureChunk | null => {
  const inter = intersect(range, chunks);
  if (!inter.length) {
    return null;
  }
  // add all area surface
  const areaPressure = inter.map(pressureChunkToAreaPressure).reduce(scanPressure, 0);
  return {
    areaPressure,
    end: lastTimeRange(inter),
    start: firstTimeRange(inter),
  };
};

/**
 * start-before: 0 -> 1
 * start-after: 1 -> 0
 *
 * merge places with chunk (multiply pressure)
 */
const adjustAreaPressure = (places: ReadonlyArray<IPotRange>) => (
  chunk: IAreaPressureChunk | null
): IPressureChunk => {};

const computeContiguousPressureChunk = (
  potential: IPotentialitySimul,
  chunks: IPressureChunk[]
): IPressureChunk | null => {
  if (!chunks.length) {
    return null;
  }
  const areaPressures = potential.places
    .map(place => {
      debugger;
      const tiniestStartingRange = placeToTinniest(place);
      const [startRange, endRange] = placeToStartEndRanges(place);

      // Intersect with tiniest ranges (before/after)
      const dividedChunks = intersect(tiniestStartingRange, chunks);
      const allResultChunks = R.unnest(dividedChunks.map(divideChunkByDuration(potential.duration)))
        .filter(c => withinRange(startRange)(c.start) && withinRange(endRange)(c.end))
        .map(rangeChunkIntersectin(chunks))
        .filter(c => c != null && c.end - c.start >= potential.duration)
        .map(adjustAreaPressure(place));
      if (allResultChunks.length < 2) {
        return allResultChunks[0];
      }
      return reduceChunksToMin(allResultChunks);
    })
    .filter(p => p != null);
  if (areaPressures.length < 2) {
    return areaPressures[0];
  }
  return reduceChunksToMin(areaPressures);
};

const reduceChunksToMin = (areaPressures: IPressureChunk[]): IPressureChunk => {
  return areaPressures.reduce((acc, curr) => (acc.areaPressure <= curr.areaPressure ? acc : curr));
};

const placeToTinniest = (places: ReadonlyArray<IPotRange>): IRange => {
  const [start, end] = placeToStartEndRanges(places);
  return rangeToDuration(start) <= rangeToDuration(end) ? start : end;
};

const placeToStartEndRanges = (places: ReadonlyArray<IPotRange>): [IRange, IRange] => {
  return [
    reducePlaceToRange('start')(places.filter(filterPlaceForStart)),
    reducePlaceToRange('end')(places.filter(filterPlaceForEnd)),
  ];
};

const reducePlaceToRange = (kind: 'start' | 'end') => (places: ReadonlyArray<IPotRange>) =>
  places.reduce(
    (acc, cur) => ({
      end: cur.kind === kind || cur.kind.endsWith('after') ? cur.end : acc.end,
      start: cur.kind === kind || cur.kind.endsWith('before') ? cur.start : acc.start,
    }),
    { start: -Infinity, end: Infinity }
  );

const rangeToMaterial = (toPlace: IPotentialityBase, chunk: IRange): IMaterial => {
  return {
    end: chunk.end,
    materialId: toPlace.potentialId,
    queryId: toPlace.queryId,
    start: chunk.start,
  };
};

/**
 * TODO: update areaPressure
 */
const minimizeChunkToDuration = (chunk: IRange, duration: number): IRange => ({
  ...chunk,
  end: Math.min(chunk.start + duration, chunk.end),
  start: chunk.start,
});

const placeAtomic = (toPlace: IPotentialitySimul, pressure: IPressureChunk[]): IMaterial[] => {
  const bestChunk = computeContiguousPressureChunk(toPlace, pressure);
  if (bestChunk == null) {
    return [];
  }
  return [rangeToMaterial(toPlace, minimizeChunkToDuration(bestChunk, toPlace.duration))];
};

const placeSplittableUnfold = (
  toPlace: IPotentialitySimul,
  [materializedSpace, chunks]: [number, IPressureChunk[]]
): false | [IMaterial, [number, IPressureChunk[]]] => {
  if (materializedSpace >= toPlace.duration || !chunks.length) {
    return false;
  }
  const headChunk = R.head(chunks) as IPressureChunk;
  const newChunks = R.tail(chunks);
  const headDuration = rangeToDuration(headChunk);
  const remainingDuration = toPlace.duration - materializedSpace;
  return [
    rangeToMaterial(
      toPlace,
      minimizeChunkToDuration(pressureChunkToAreaPressure(headChunk), remainingDuration)
    ),
    [Math.min(materializedSpace + headDuration, toPlace.duration), newChunks],
  ];
};
const sortByPressure = (chunks: ReadonlyArray<IPressureChunk>) =>
  [...chunks].sort((a, b) => computePressureArea(a) - computePressureArea(b));

const placeSplittable = (toPlace: IPotentialitySimul, pressure: IPressureChunk[]): IMaterial[] => {
  const sortedPressure = sortByPressure(pressure);
  return R.unfold(R.partial(placeSplittableUnfold, [toPlace]), [0, sortedPressure]).map(
    (material, i) => ({ ...material, splitId: i })
  );
};

/**
 * TODO: Only use target places
 */
const simulatePlacement = (
  toPlace: IPotentialitySimul,
  pressure: IPressureChunk[]
): IMaterial[] => {
  if (!toPlace.isSplittable) {
    return placeAtomic(toPlace, pressure);
  }
  return placeSplittable(toPlace, pressure);
};

const validatePotentials = R.none(R.propSatisfies(p => p > 1, 'pressure'));

const potentialsToMeanPressure = R.pipe(
  (pots: IPotentiality[]) => pots.map(R.pathOr(0, ['pressure']) as (n: IPotentiality) => number), // Workaround for npm-ramda issue #311
  R.mean
);

const potToSimul = (
  durationType: keyof ITimeDurationInternal,
  pot: IPotentiality
): IPotentialitySimul => ({
  duration: pot.duration[durationType],
  isSplittable: pot.isSplittable,
  places: pot.places,
  potentialId: pot.potentialId,
  queryId: pot.queryId,
});
