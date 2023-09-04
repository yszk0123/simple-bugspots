export function defaults<T extends object>(a: Partial<T>, b: T): T {
  const result = { ...a };
  for (const [key, value] of Object.entries(b)) {
    result[key as keyof typeof b] ??= value;
  }
  return result as T;
}
