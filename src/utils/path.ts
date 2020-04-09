import { relative, sep, normalize, isAbsolute } from "path";

export function pathIsRelativeAndNested(path: string): boolean {
  return !isAbsolute(path) && !path.startsWith(`..${sep}`);
}

export function humanizePath(
  path: string,
  base: string = process.cwd()
): string {
  path = normalize(path);
  const relativePath = relative(base, path);

  return pathIsRelativeAndNested(relativePath)
    ? `.${sep}${relativePath}`
    : path;
}
