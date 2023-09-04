import { round } from './round';

type TestCase = { input: [number, number]; expected: number };

const testcases: TestCase[] = [
  { input: [0, 0], expected: 0 },
  { input: [1, 0], expected: 1 },
  { input: [1.4, 0], expected: 1 },
  { input: [1.5, 0], expected: 2 },

  { input: [0, 1], expected: 0 },
  { input: [0.1, 1], expected: 0.1 },
  { input: [0.14, 1], expected: 0.1 },
  { input: [0.15, 1], expected: 0.2 },

  { input: [0.123, 2], expected: 0.12 },
];

for (const { input, expected } of testcases) {
  test(`${input[0]} to ${input[1]} should be ${expected}`, () => {
    const actual = round(input[0], input[1]);
    expect(actual).toBe(expected);
  });
}
