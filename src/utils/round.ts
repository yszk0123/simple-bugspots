export function round(n: number, d: number): number {
  const l = 10 ** d;
  return Math.round(n * l) / l;
}
