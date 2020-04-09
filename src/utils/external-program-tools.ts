import semver from "semver";
import { execSync } from "child_process";
import { FileReader, fileReader as defaultFileReader } from "./filesystem";
import path from "path";

type GetProgramVersionOptions = {
  cwd?: string;
  pattern?: RegExp;
};

export function getProgramVersion(
  command: string,
  {
    cwd = process.cwd(),
    pattern = /((?:\d+\.)+\d+)\s*$/i,
  }: GetProgramVersionOptions = {}
): string {
  const output = execSync(command, { cwd }).toString();
  const [, version] = output.match(pattern) || [];
  return version;
}

export function hasProgram(
  name: string,
  versionRange: string,
  {
    getVersionArgs = "--version",
    ...options
  }: { getVersionArgs?: string } & GetProgramVersionOptions = {}
): boolean {
  const version = getProgramVersion(`${name} ${getVersionArgs}`, options);

  return (
    version !== null &&
    semver.satisfies(`${semver.coerce(version as string)}`, versionRange, {
      loose: true,
    })
  );
}

function getDesiredMeteorVersion(
  meteorRoot = process.cwd(),
  fileReader: FileReader = defaultFileReader
): string {
  const releaseFile = path.join(meteorRoot, ".meteor", "release");
  const release = fileReader.readTextFile(releaseFile);
  const [, version = "1.4.0"] = release.match(/((?:\d+\.)+\d)$/) || [];
  return version;
}

export function hasMeteor(): boolean {
  const version = getDesiredMeteorVersion();
  return hasProgram("meteor", `^${version}`);
}

export function hasPulumi(): boolean {
  return hasProgram("pulumi", "^2.0.0", { getVersionArgs: "version" });
}

export function hasNpm(): boolean {
  return hasProgram("npm", "^6.4.1");
}

export function getNpmExecutable(): string | null {
  return hasMeteor() ? "meteor npm" : hasNpm() ? "npm" : null;
}

export function requireNpmExecutable(): string {
  const npm = getNpmExecutable();

  if (!npm) {
    throw new Error(
      "Could not find a suitable meteor or npm executable. Please ensure that a recent meteor release is installed."
    );
  }

  return npm;
}
