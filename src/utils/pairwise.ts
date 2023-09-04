export function pairwise<T>(arr: T[]): [T, T][] {
  const res: [T, T][] = [];
  for (let i = 0; i < arr.length - 1; i++) {
    res.push([arr[i], arr[i + 1]]);
  }
  return res;
}
