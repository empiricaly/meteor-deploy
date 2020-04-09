import path from "path";
import info from "package.json";
import { readConfig } from "./config-files";

export type PackageInfo = {
  name: string;
  version?: string;
  description?: string;
  bin?: {
    [execName: string]: string;
  };
  dependencies?: {
    [packageName: string]: string;
  };
  devDependencies?: {
    [packageName: string]: string;
  };
};

type FieldName = keyof PackageInfo;

const fields: FieldName[] = [
  "name",
  "version",
  "description",
  "dependencies",
  "devDependencies",
  "bin",
];

export function getPackageInfo(packagePath?: string): PackageInfo {
  const packageInfo = packagePath
    ? readConfig<PackageInfo>(path.join(packagePath, "package.json"))
    : info;
  return Object.assign(
    {},
    ...Object.entries(packageInfo)
      .filter(([field]) => fields.includes(field as FieldName))
      .map(([key, value]) => ({ [key]: value }))
  );
}
