import * as pulumi from "./pulumi";
import { getPackageInfo } from "/src/utils";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import {
  ExecFileSyncOptionsWithStringEncoding,
  execFileSync,
} from "child_process";

type BufferEncoding = ExecFileSyncOptionsWithStringEncoding["encoding"];

interface HelperProgram {
  readonly encoding: BufferEncoding;
  install(dir: string, version?: string): void;
  installDirectoryWithinHelperDirectory(helperDirectory: string): string;
  executableFile(installDir: string): string | null;
  getInstalledVersion(installDir: string): string | null;
  getDefaultVersion(): string;
}

const helperPrograms = {
  pulumi,
};

export type HelperProgramName = keyof typeof helperPrograms;

export function getHelperProgram<T extends HelperProgramName>(
  name: T
): typeof helperPrograms[T] & HelperProgram {
  return helperPrograms[name];
}

export function getHelperProgramDir(home = process.env.HOME): string {
  const { name, version = "unknown" } = getPackageInfo();
  return path.join(home || "~", "." + name.replace(/^@/, ""), version);
}

export function isHelperProgram(name: string): name is HelperProgramName {
  return (helperPrograms as Record<string, unknown>)[name] !== undefined;
}

export function getHelperExecutables(
  dir = getHelperProgramDir()
): { name: string; executableFile: string }[] {
  return Object.entries(helperPrograms)
    .map(([name, helper]) => ({
      name,
      executableFile: helper.executableFile(
        helper.installDirectoryWithinHelperDirectory(dir)
      ),
    }))
    .filter(({ executableFile }) => executableFile) as {
    name: string;
    executableFile: string;
  }[];
}

export function getHelperExecutable(
  name: HelperProgramName,
  {
    autoInstall = false,
    helperDir = getHelperProgramDir(),
  }: { autoInstall?: boolean; helperDir?: string } = {}
): string | null {
  const helper = getHelperProgram(name);
  const installDir = helper.installDirectoryWithinHelperDirectory(helperDir);

  const executable = helper.executableFile(installDir);

  if (!executable && autoInstall) {
    helper.install(helperDir);
    return helper.executableFile(installDir);
  }

  return executable;
}

export function executeHelper(
  name: HelperProgramName,
  args: string[] = [],
  {
    helperDir,
    autoInstall,
    encoding = getHelperProgram(name).encoding,
    ...options
  }: {
    helperDir?: string;
    autoInstall?: boolean;
  } & Omit<ExecFileSyncOptionsWithStringEncoding, "encoding"> & {
      encoding?: BufferEncoding;
    } = {}
): string {
  const executableFile = getHelperExecutable(name, { helperDir, autoInstall });
  if (!executableFile) {
    throw new Error(`Required helper program '${name}' is not installed`);
  }
  return execFileSync(executableFile, args, { encoding, ...options });
}

export function installHelperProgram(
  name: HelperProgramName,
  version?: string
): void {
  const dir = getHelperProgramDir();
  const helperProgram = getHelperProgram(name);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  helperProgram.install(
    helperProgram.installDirectoryWithinHelperDirectory(dir),
    version
  );
}

export function getHelperProgramVersion(
  name: HelperProgramName
): string | null {
  const helperProgram = getHelperProgram(name);
  const dir = getHelperProgramDir();

  if (!existsSync(dir)) {
    return null;
  }

  return helperProgram.getInstalledVersion(
    helperProgram.installDirectoryWithinHelperDirectory(dir)
  );
}
