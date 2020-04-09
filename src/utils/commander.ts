import { Option } from "commander";

export function getAttributeName(flags: string, description: string): string {
  const option = new Option(flags, description);
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore attributeName is private, but it is safer to use it than having to make assumptions about inner workings
  return option.attributeName();
}
