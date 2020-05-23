import pulumi from "./pulumi";
import { getPackageInfo } from "/src/utils";
import path from "path";
import { existsSync, mkdirSync } from "fs";

const installers = {
  pulumi,
};

export type InstallableProgramName = keyof typeof installers;

export function getHelperProgramDir(home = process.env.HOME): string {
  const { name, version = "unknown" } = getPackageInfo();
  return path.join(home || "~", "." + name.replace(/^@/, ""), version);
}

export function isHelperProgram(name: string): name is InstallableProgramName {
  return (installers as Record<string, unknown>)[name] !== undefined;
}

export function installHelperProgram(
  name: InstallableProgramName,
  version?: string
): void {
  const dir = getHelperProgramDir();

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  installers[name](getHelperProgramDir(), version);
}
