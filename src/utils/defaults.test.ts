import { defaults } from './defaults';

test('should preserve empty', () => {
  const actual = defaults({}, {});
  expect(actual).toEqual({});
});

test('should set default', () => {
  const actual = defaults({}, { a: 1 });
  expect(actual).toEqual({ a: 1 });
});

test('should not overwrite', () => {
  const actual = defaults({ a: 0 }, { a: 1 });
  expect(actual).toEqual({ a: 0 });
});

test('should set multiple properties', () => {
  const actual = defaults({ a: 0 }, { a: 1, b: 2 });
  expect(actual).toEqual({ a: 0, b: 2 });
});
