import pulumi from "./pulumi";
import { getPackageInfo } from "/src/utils";
import path from "path";
import { existsSync, mkdirSync } from "fs";

const installers = {
  pulumi,
};

export type InstallableProgramName = keyof typeof installers;

export function getInstallDir(home = process.env.HOME): string {
  const { name, version = "unknown" } = getPackageInfo();
  return path.join(home || "~", "." + name.replace(/^@/, ""), version);
}

export function isInstallable(name: string): name is InstallableProgramName {
  return (installers as Record<string, unknown>)[name] !== undefined;
}

export function install(name: InstallableProgramName, version?: string): void {
  const dir = getInstallDir();

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  installers[name](getInstallDir(), version);
}
