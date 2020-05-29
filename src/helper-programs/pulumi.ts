import path from "path";

import { ROOT } from "/root";
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { version as defaultPulumiVersion } from "@pulumi/pulumi/package.json";

export function installDirectoryWithinHelperDirectory(parent: string): string {
  // As hardcoded in scripts/get_pulumi.sh
  return path.join(parent, "pulumi");
}

export function executableFile(installDir: string): string | null {
  const pulumi = path.join(installDir, "bin", "pulumi");
  return existsSync(pulumi) ? pulumi : null;
}

export function getInstalledVersion(installDir: string): string | null {
  const pulumi = executableFile(installDir);
  return (
    pulumi &&
    execFileSync(pulumi, ["version"], { encoding: "utf-8" })
      .trim()
      .replace(/^v/i, "")
  );
}

export function getDefaultVersion(): string {
  return defaultPulumiVersion;
}

export const encoding = "utf-8";

export function install(
  directory: string,
  version = defaultPulumiVersion
): void {
  const installDir = installDirectoryWithinHelperDirectory(directory);
  if (getInstalledVersion(installDir) !== version) {
    execFileSync(
      path.join(ROOT, "scripts", "get_pulumi.sh"),
      ["--version", version],
      {
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          HOME: directory,
        },
      }
    );
  }
}
