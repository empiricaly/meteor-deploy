import path from "path";

import { ROOT } from "/root";
import { execFileSync } from "child_process";
import { existsSync } from "fs";

export function installDirectory(parent: string): string {
  // As hardcoded in scripts/get_pulumi.sh
  return path.join(parent, ".pulumi");
}

export function pulumiExecutable(installDir: string): string | null {
  const pulumi = path.join(installDir, "bin", "pulumi");
  return existsSync(pulumi) ? pulumi : null;
}

export function installedPulumiVersion(dir: string): string | null {
  const pulumi = pulumiExecutable(installDirectory(dir));
  return (
    pulumi &&
    execFileSync(pulumi, ["version"], { encoding: "utf-8" })
      .trim()
      .replace(/^v/i, "")
  );
}

export default function installPulumi(
  directory: string,
  version = "latest"
): void {
  if (installedPulumiVersion(directory) !== version) {
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
