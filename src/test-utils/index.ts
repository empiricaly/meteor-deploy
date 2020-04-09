import { describe, Suite } from "mocha";
import { ROOT } from "root";
import { relative, parse, join } from "path";

type SuiteFunction = (this: Suite) => void;

export function describeFile(
  filename: string,
  fn: SuiteFunction
): ReturnType<typeof describe> {
  const { dir, name } = parse(relative(ROOT, filename));

  return describe(join(dir, name.replace(/\.test/, "")), fn);
}

export function describeFn(
  fn: Function,
  suite: SuiteFunction
): ReturnType<typeof describe> {
  return describe(`${fn.name}()`, suite);
}
