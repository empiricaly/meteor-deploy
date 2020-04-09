export function sortObject<V, T extends Record<string, V>>(
  obj: T,
  sortFn?: (a: string, b: string) => number
): T {
  return Object.assign(
    {},
    ...Object.keys(obj)
      .sort(sortFn)
      .map((key) => ({ [key]: obj[key] }))
  );
}

export function leastChangeCompare<T>(
  obj: Record<string, T> | {}
): (a: string, b: string) => number {
  const indices = Object.assign(
    {},
    ...Object.keys(obj).map((key, index) => ({ [key]: index }))
  );
  return (a, b): number => {
    const indexA = indices[a] || Infinity;
    const indexB = indices[b] || Infinity;

    return indexA === indexB ? a.localeCompare(b) : indexA - indexB;
  };
}
