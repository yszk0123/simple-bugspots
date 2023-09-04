import { pairwise } from './pairwise';

test('empty', () => {
  const actual = pairwise([]);
  expect(actual).toEqual([]);
});

test('1 item', () => {
  const actual = pairwise([1]);
  expect(actual).toEqual([]);
});

test('2 items', () => {
  const actual = pairwise([1, 2]);
  expect(actual).toEqual([[1, 2]]);
});

test('3 items', () => {
  const actual = pairwise([1, 2, 3]);
  expect(actual).toEqual([
    [1, 2],
    [2, 3],
  ]);
});
