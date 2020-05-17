import { describe } from "@jest/globals";
import { Global } from "@jest/types";
import { ROOT } from "root";
import { relative, parse, join } from "path";

export function describeFile(
  filename: string,
  suite: Global.BlockFn
): ReturnType<typeof describe> {
  const { dir, name } = parse(relative(ROOT, filename));

  return describe(join(dir, name.replace(/\.test/, "")), suite);
}

export function describeFn(
  fn: Function,
  suite: Global.BlockFn
): ReturnType<typeof describe> {
  return describe(`${fn.name}()`, suite);
}

export function describeClass(
  cls: Function,
  suite: Global.BlockFn
): ReturnType<typeof describe> {
  return describe(`class ${cls.name}`, suite);
}
